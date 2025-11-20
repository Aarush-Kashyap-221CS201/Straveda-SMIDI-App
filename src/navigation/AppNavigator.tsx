import React, { useContext } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AuthContext } from "../context/AuthContext";

import LoginScreen from "../screens/LoginScreen";
import DashboardScreen from "../screens/DashboardScreen";
import ProductsScreen from "../screens/ProductsScreen";
import BillingScreen from "../screens/BillingScreen";
import ReportsScreen from "../screens/ReportsScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
import TransactionDetailScreen from "../screens/TransactionDetailScreen";
import EmployeesScreen from "../screens/EmployeesScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { loggedIn } = useContext(AuthContext);

  return (
    <NavigationContainer>
      <Stack.Navigator 
        screenOptions={{ 
          headerShown: false,
          animation: 'slide_from_right'
        }}
      >
        {!loggedIn ? (
          // Auth screens - only show Login when not logged in
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
          />
        ) : (
          // Main app screens - only show when logged in
          <>
            <Stack.Screen 
              name="Dashboard" 
              component={DashboardScreen} 
            />
            <Stack.Screen 
              name="Products" 
              component={ProductsScreen} 
            />
            <Stack.Screen 
              name="Employees" 
              component={EmployeesScreen} 
            />
            <Stack.Screen 
              name="Billing" 
              component={BillingScreen} 
            />
            <Stack.Screen 
              name="Reports" 
              component={ReportsScreen} 
            />
            <Stack.Screen 
              name="Analytics" 
              component={AnalyticsScreen} 
            />
            <Stack.Screen 
              name="TransactionDetail" 
              component={TransactionDetailScreen}
              options={{ 
                title: 'Transaction Details',
                headerShown: true, // Show header for this screen only
                headerBackTitle: "Back"
              }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}