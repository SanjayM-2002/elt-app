const multer = require('multer');
const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { DataFrame } = require('dataframe-js');
const { parse } = require('csv-parse');
const { promisify } = require('util');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const parseCsv = promisify(parse);

const upload = multer({ dest: 'uploads/' });

const uploadFiles = upload.fields([
  { name: 'paymentReport', maxCount: 1 },
  { name: 'taxReport', maxCount: 1 },
]);

const processReports2 = async (req, res) => {
  try {
    console.log('Received files:', req.files);

    const responseDir = 'response';
    if (!fs.existsSync(responseDir)) {
      fs.mkdirSync(responseDir);
    }

    const paymentFilePath = req.files.paymentReport[0].path;
    const taxFilePath = req.files.taxReport[0].path;

    console.log('Processing payment report...');
    let paymentData;
    try {
      const rawCSV = fs.readFileSync(paymentFilePath, 'utf8');
      const records = await parseCsv(rawCSV, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      });

      paymentData = new DataFrame(records);
      console.log('Payment Data Columns:', paymentData.listColumns());
      console.log(
        'First few rows of payment data:',
        paymentData.toJSON().slice(0, 5)
      );
    } catch (error) {
      console.error('Error reading CSV file:', error);
      throw new Error('Failed to read payment CSV file.');
    }

    if (!paymentData.listColumns().includes('type')) {
      throw new Error('Column "type" not found in payment data');
    }

    const filteredPaymentData = paymentData.filter(
      (row) => row.get('type') !== 'Transfer'
    );

    const renamedPaymentData = filteredPaymentData
      .rename('type', 'Payment Type')
      .withColumn('Transaction Type', () => 'Payment');

    const updatedPaymentData = renamedPaymentData.map((row) => {
      const paymentType = row.get('Payment Type');
      if (
        [
          'Adjustment',
          'FBA Inventory Fee',
          'Fulfilment Fee Refund',
          'Service Fee',
        ].includes(paymentType)
      ) {
        return row.set('Payment Type', 'Order');
      } else if (paymentType === 'Refund') {
        return row.set('Payment Type', 'Return');
      }
      return row;
    });

    console.log('Payment report processed.');

    console.log('Processing tax report...');
    let taxData;
    try {
      const taxWorkbook = xlsx.readFile(taxFilePath);
      const taxSheetName = taxWorkbook.SheetNames[0];
      const taxJsonData = xlsx.utils.sheet_to_json(
        taxWorkbook.Sheets[taxSheetName]
      );
      taxData = new DataFrame(taxJsonData);
      console.log('Original Tax Data Columns:', taxData.listColumns());
      console.log('First few rows of tax data:', taxData.toJSON().slice(0, 5));
    } catch (error) {
      console.error('Error reading XLSX file:', error);
      throw new Error('Failed to read tax XLSX file.');
    }

    const filteredTaxData = taxData
      .filter((row) => row.get('Transaction Type') !== 'Cancel')
      .map((row) => {
        let transactionType = row.get('Transaction Type');
        if (
          transactionType === 'Refund' ||
          transactionType === 'FreeReplacement'
        ) {
          transactionType = 'Return';
        }
        return row.set('Transaction Type', transactionType);
      });

    const renamedTaxData = filteredTaxData
      .rename('Invoice Date', 'date/time')
      .rename('Order Id', 'order id')
      .rename('Item Description', 'description')
      .rename('Invoice Amount', 'total')
      .withColumn('Payment Type', () => 'Order')
      .withColumn('Transaction Type', () => 'Tax');

    console.log('Renamed Tax Data Columns:', renamedTaxData.listColumns());

    const finalTaxData = renamedTaxData.select(
      'date/time',
      'order id',
      'description',
      'total',
      'Payment Type',
      'Transaction Type'
    );

    console.log('Final Tax Data Columns:', finalTaxData.listColumns());

    console.log('Merging data...');
    const mergedData = updatedPaymentData.union(finalTaxData);

    console.log('Merged data columns: ', mergedData.listColumns());

    console.log('Processing merged data...');

    const summaryData = mergedData
      .groupBy('description')
      .aggregate((group) => {
        const sumTotal = group.stat.sum('total');
        return sumTotal;
      })
      .filter((row) => row['description'] !== null);

    const summary = {
      description: [],
      aggregation: [],
    };

    summaryData.toCollection().forEach((row) => {
      summary.description.push(row['description'] || 'Unknown Description');
      summary.aggregation.push(row['aggregation'] || 0);
    });

    console.log('Summary Data:', summary);

    console.log('Summary Data:', JSON.parse(summaryData.toJSON()));

    // const detailedData = mergedData.map((row) => {
    //   let category = '';
    //   const orderId = row.get('order id');
    //   if (orderId && orderId.length === 10) {
    //     category = 'Removal Order IDs';
    //   } else if (row.get('Transaction Type') === 'Return' && row.get('total')) {
    //     category = 'Return';
    //   } else if (
    //     row.get('Transaction Type') === 'Payment' &&
    //     row.get('total') < 0
    //   ) {
    //     category = 'Negative Payout';
    //   } else if (row.get('total') && row.get('total')) {
    //     category = 'Order & Payment Received';
    //   } else if (row.get('total') && !row.get('total')) {
    //     category = 'Order Not Applicable but Payment Received';
    //   } else if (row.get('total') && !row.get('total')) {
    //     category = 'Payment Pending';
    //   }
    //   return row.set('Category', category);
    // });

    const detailedData = mergedData.map((row) => {
      let category = 'Payment Pending';
      const orderId = row.get('order id');
      const transactionType = row.get('Transaction Type');
      const total = row.get('total');

      if (orderId && orderId.length === 10) {
        category = 'Removal Order IDs';
      } else if (transactionType === 'Return' && total) {
        category = 'Return';
      } else if (transactionType === 'Payment' && total < 0) {
        category = 'Negative Payout';
      } else if (total) {
        category = 'Order & Payment Received';
      }

      return row.set('Category', category);
    });

    console.log('Detailed data processed.');

    console.log('Calculating tolerance...');
    const toleranceData = detailedData.map((row) => {
      const pna = row.get('total');
      const shipmentAmount = row.get('total');
      let percentage = 0;
      if (shipmentAmount > 0) {
        percentage = (pna / shipmentAmount) * 100;
      }

      let toleranceStatus = 'Tolerance Breached';
      if (pna < 300 && percentage > 50) toleranceStatus = 'Within Tolerance';
      else if (pna < 500 && percentage > 45)
        toleranceStatus = 'Within Tolerance';
      else if (pna < 900 && percentage > 43)
        toleranceStatus = 'Within Tolerance';
      else if (pna < 1500 && percentage > 38)
        toleranceStatus = 'Within Tolerance';
      else if (pna >= 1500 && percentage > 30)
        toleranceStatus = 'Within Tolerance';

      return row
        .set('percentage', percentage)
        .set('toleranceStatus', toleranceStatus);
    });

    console.log('Tolerance data processed.');

    const categoryStats = detailedData
      .groupBy('Category')
      .aggregate((group) => group.count())
      .toCollection()
      .reduce((acc, row) => {
        acc[row.Category] = row['aggregation'];
        return acc;
      }, {});

    const toleranceStats = toleranceData
      .groupBy('toleranceStatus')
      .aggregate((group) => group.count())
      .toCollection()
      .reduce((acc, row) => {
        acc[row.toleranceStatus] = row['aggregation'];
        return acc;
      }, {});

    console.log('Category Stats:', categoryStats);
    console.log('Tolerance Stats:', toleranceStats);

    // const csvWriterSummary = createCsvWriter({
    //   path: path.join(responseDir, 'summaryData.csv'),
    //   header: [
    //     { id: 'description', title: 'Description' },
    //     { id: 'total', title: 'Total' },
    //   ],
    // });

    // const csvWriterCategories = createCsvWriter({
    //   path: path.join(responseDir, 'detailedData.csv'),
    //   header: [
    //     { id: 'date/time', title: 'Date/Time' },
    //     { id: 'order id', title: 'Order ID' },
    //     { id: 'description', title: 'Description' },
    //     { id: 'total', title: 'Total' },
    //     { id: 'Payment Type', title: 'Payment Type' },
    //     { id: 'Transaction Type', title: 'Transaction Type' },
    //     { id: 'Category', title: 'Category' },
    //   ],
    // });

    // const csvWriterTolerance = createCsvWriter({
    //   path: path.join(responseDir, 'toleranceData.csv'),
    //   header: [
    //     { id: 'date/time', title: 'Date/Time' },
    //     { id: 'order id', title: 'Order ID' },
    //     { id: 'description', title: 'Description' },
    //     { id: 'total', title: 'Total' },
    //     { id: 'Payment Type', title: 'Payment Type' },
    //     { id: 'Transaction Type', title: 'Transaction Type' },
    //     { id: 'Category', title: 'Category' },
    //     { id: 'percentage', title: 'Percentage' },
    //     { id: 'toleranceStatus', title: 'Tolerance Status' },
    //   ],
    // });

    // await csvWriterSummary.writeRecords(summaryData.toJSON());
    // await csvWriterCategories.writeRecords(detailedData.toJSON());
    // await csvWriterTolerance.writeRecords(toleranceData.toJSON());

    // console.log('CSV files written.');

    res.status(200).json({ summary, categoryStats, toleranceStats });

    fs.unlinkSync(paymentFilePath);
    fs.unlinkSync(taxFilePath);
  } catch (error) {
    console.error('Error processing reports:', error);
    res.status(500).json({ error: 'Failed to process reports.' });
  }
};

module.exports = { uploadFiles, processReports, processReports2 };
