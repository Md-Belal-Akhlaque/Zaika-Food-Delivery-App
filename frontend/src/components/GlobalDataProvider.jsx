import React from 'react';
import { useSelector } from 'react-redux';
import useGetItemsByCity from '../hooks/useGetItemsByCity';
import useGetShopByCity from '../hooks/useGetShopByCity';
import useGetCurrentUser from '../hooks/useGetCurrentUser';
import useGetCity from '../hooks/useGetCity';
import useGetMyOrders from '../hooks/useGetMyOrders';
import useCartSync from '../hooks/useCartSync';

/**
 * GlobalDataProvider component
 * - Centralizes global data fetching hooks
 * - Improves App.jsx maintainability
 * - Manages cart synchronization
 */
export const useGlobalData = () => {
  // 1. Initial user check (always runs)
  useGetCurrentUser();

  // 2. City & Location (runs if user logged in)
  // useGetCity internally checks for userData
  useGetCity();

  // 3. City-dependent data (runs if city is known)
  // these internally check for currentCity
  useGetItemsByCity();
  useGetShopByCity();

  // 4. User-specific data (runs if logged in)
  // useGetMyOrders should ideally check for userData internally
  useGetMyOrders();

  // 5. Cart Sync (always runs, handles guest vs user)
  useCartSync();
};

const GlobalDataProvider = ({ children }) => {
  useGlobalData();

  return <>{children}</>;
};

export default GlobalDataProvider;
