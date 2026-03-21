import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ApolloProvider, InMemoryCache, ApolloClient } from '@apollo/client';

// Screens
import HomeScreen from './src/screens/HomeScreen';
import FeedScreen from './src/screens/FeedScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import MenuScreen from './src/screens/MenuScreen';
import ChatScreen from './src/screens/ChatScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';

// Store
import { useAuthStore } from './src/store/authStore';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const apolloClient = new ApolloClient({
  uri: 'http://localhost:4000/graphql',
  cache: new InMemoryCache(),
});

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1877F2',
        tabBarInactiveTintColor: '#65676B',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Friends" component={FeedScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Menu" component={MenuScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <ApolloProvider client={apolloClient}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="auto" />
          {isAuthenticated ? <MainTabs /> : <AuthStack />}
        </NavigationContainer>
      </SafeAreaProvider>
    </ApolloProvider>
  );
}
