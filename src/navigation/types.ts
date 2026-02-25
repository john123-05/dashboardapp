export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type DashboardDrawerParamList = {
  Dashboard: undefined;
  Revenue: undefined;
  Purchases: undefined;
  Users: undefined;
  Photos: undefined;
  Leads: undefined;
  Personalization: undefined;
  Support: undefined;
  SystemHealth: undefined;
  Settings: undefined;
};

// Backward compatibility for any existing screen props.
export type AppStackParamList = DashboardDrawerParamList;
