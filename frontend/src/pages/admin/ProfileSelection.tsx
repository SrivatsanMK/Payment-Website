import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, LayoutDashboard, Sun, Moon } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { useTheme } from '../../context/ThemeContext';

export const ProfileSelection: React.FC = () => {
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const { theme, toggleTheme } = useTheme();

  const handleProfileSelect = (profile: 'dashboard' | 'private') => {
    localStorage.setItem('adminProfile', profile);
    // Both profiles route to the dashboard for now, but we'll set the token
    // to separate data in the future if needed.
    navigate('/admin/dashboard');
  };

  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      {/* Dark Mode Toggle */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 rounded-full transition-colors z-10"
        title="Toggle Light/Dark Theme"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
          Who's accessing the system?
        </h1>
        <p className="mt-4 text-lg text-slate-500 dark:text-slate-400">
          Welcome back, {admin?.name || 'Admin'}. Please select your workspace.
        </p>
      </div>

      <div className="flex flex-col gap-8 md:flex-row md:gap-12">
        {/* Profile 1: Private Business (Placeholder) */}
        <div 
          onClick={() => handleProfileSelect('private')}
          className="group flex cursor-pointer flex-col items-center gap-4 transition-all duration-300 hover:scale-105"
        >
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl border-4 border-transparent bg-white dark:bg-slate-800 text-teal-500 shadow-xl transition-all duration-300 group-hover:border-teal-500 group-hover:bg-slate-50 dark:group-hover:bg-slate-700">
            <Building className="h-20 w-20" />
          </div>
          <span className="text-xl font-medium text-slate-600 dark:text-slate-400 transition-colors duration-300 group-hover:text-slate-900 dark:group-hover:text-white">
            Private Business
          </span>
        </div>

        {/* Profile 2: Green Glide Logistics */}
        <div 
          onClick={() => handleProfileSelect('dashboard')}
          className="group flex cursor-pointer flex-col items-center gap-4 transition-all duration-300 hover:scale-105"
        >
          <div className="flex h-40 w-40 items-center justify-center rounded-2xl border-4 border-transparent bg-white dark:bg-slate-800 text-primary-500 shadow-xl transition-all duration-300 group-hover:border-primary-500 group-hover:bg-slate-50 dark:group-hover:bg-slate-700">
            <LayoutDashboard className="h-20 w-20" />
          </div>
          <span className="text-xl font-medium text-slate-600 dark:text-slate-400 transition-colors duration-300 group-hover:text-slate-900 dark:group-hover:text-white">
            Green Glide Logistics
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProfileSelection;
