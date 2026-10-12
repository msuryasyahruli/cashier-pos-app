import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components';
import { Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-slate-50">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
        <span className="text-2xl font-bold">404</span>
      </div>
      <h2 className="text-xl font-bold text-slate-800">Page Not Found</h2>
      <p className="text-xs text-slate-500 max-w-sm mt-1 mb-6">
        The terminal page you are looking for does not exist or has been moved.
      </p>
      <Link to="/">
        <Button icon={<Home size={16} />}>
          Back to Cashier POS
        </Button>
      </Link>
    </div>
  );
};
