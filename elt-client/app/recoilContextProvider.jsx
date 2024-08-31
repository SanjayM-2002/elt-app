'use client';

import { RecoilRoot } from 'recoil';

export default function RecoidContextProvider({ children }) {
  return <RecoilRoot>{children}</RecoilRoot>;
}
