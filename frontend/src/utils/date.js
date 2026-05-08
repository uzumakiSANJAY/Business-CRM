export const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const daysDiff = (date) =>
  Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
