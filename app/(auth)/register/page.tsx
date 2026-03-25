import { Suspense } from 'react';
import RegisterPage from './RegisterPage'; 

export default function page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gradient-to-br from-green-950 to-green-800" />}>
      <RegisterPage/>
    </Suspense>
  );
}


