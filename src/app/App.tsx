import { RouterProvider } from 'react-router';
import { ApolloProvider } from '@apollo/client/react';
import { router } from './routes';
import { AuthProvider } from '../contexts/AuthContext';
import { ChatProvider } from '../contexts/ChatContext';
import { apolloClient } from '../lib/apollo';
import { StagingBanner } from './components/staging-banner';

export default function App() {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <ChatProvider>
          <RouterProvider router={router} />
          <StagingBanner />
        </ChatProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
