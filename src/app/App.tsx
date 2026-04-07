import { RouterProvider } from 'react-router';
import { ApolloProvider } from '@apollo/client/react';
import { router } from './routes';
import { AuthProvider } from '../contexts/AuthContext';
import { apolloClient } from '../lib/apollo';

export default function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ApolloProvider>
  );
}
