'use client';

import { useRecoilState, useSetRecoilState } from 'recoil';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { emailState } from './recoil/atom';

export default function Home() {
  const setEmail = useSetRecoilState(emailState);
  const [input, setInput] = useState('');
  const router = useRouter();

  const handleSubmit = (e) => {
    e.preventDefault();
    setEmail(input);
    router.push('/reports');
  };

  return (
    <div className='flex items-center justify-center h-screen bg-gray-100'>
      <div className='p-8 bg-white shadow-md rounded-lg'>
        <h1 className='text-2xl font-bold mb-4'>Enter Your Email</h1>
        <form onSubmit={handleSubmit}>
          <input
            type='email'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className='border border-gray-300 p-2 rounded-md w-full mb-4'
            placeholder='Enter your email'
            required
          />
          <button
            type='submit'
            className='bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600'
          >
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}
