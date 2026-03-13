import { useEffect } from 'react';
import { useRouter } from 'next/router';

const REFERRAL_KEY = 'pf_referral_code';

export default function JoinPage() {
  const router = useRouter();
  const { code } = router.query;

  useEffect(() => {
    if (!router.isReady) return;

    const refCode = Array.isArray(code) ? code[0] : code;
    if (refCode && typeof refCode === 'string' && refCode.trim()) {
      localStorage.setItem(REFERRAL_KEY, refCode.trim());
    }

    router.replace('/');
  }, [router.isReady, code, router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <p className="text-gray-400">Redirecting...</p>
    </div>
  );
}
