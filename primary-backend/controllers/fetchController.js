const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const fetchReports = async (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ error: 'Email query parameter is required' });
  }

  try {
    const reports = await prisma.report.findMany({
      where: {
        email: email,
      },
    });

    if (reports.length === 0) {
      return res
        .status(404)
        .json({ message: 'No reports found for the given email' });
    }

    res.status(200).json(reports);
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = { fetchReports };
