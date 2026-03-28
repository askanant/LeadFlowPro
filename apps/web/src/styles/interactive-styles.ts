/**
 * Global CSS utilities for button and link hover states
 * Ensures consistent UI/UX across the application
 * 
 * Import this in your main tailwind.css or use className directly
 */

/* Button hover and active states */
export const buttonStyles = {
  primary:
    'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 transition-all duration-150',
  secondary:
    'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400 focus:ring-gray-400 transition-all duration-150',
  danger:
    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 focus:ring-red-500 transition-all duration-150',
  success:
    'bg-green-600 text-white hover:bg-green-700 active:bg-green-800 focus:ring-green-500 transition-all duration-150',
  outline:
    'border border-gray-300 text-gray-700 hover:bg-gray-50 active:bg-gray-100 focus:ring-gray-300 transition-all duration-150',
};

/* Link hover states */
export const linkStyles = {
  default: 'text-indigo-600 hover:text-indigo-700 hover:underline active:text-indigo-800 transition-colors duration-150',
  muted: 'text-gray-600 hover:text-gray-800 active:text-gray-900 transition-colors duration-150',
  danger: 'text-red-600 hover:text-red-700 active:text-red-800 transition-colors duration-150',
};

/* Card/section hover states */
export const cardStyles = {
  interactive:
    'hover:shadow-md hover:border-gray-300 active:shadow-sm transition-shadow duration-150 cursor-pointer',
  default: 'shadow-sm hover:shadow-md transition-shadow duration-150',
};

/* Input focus states */
export const inputStyles = {
  default:
    'border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all duration-150',
  error:
    'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-all duration-150',
};
