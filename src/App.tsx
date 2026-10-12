import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./configs/route";
import { AuthProvider } from "./components/auth/AuthProvider";

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
};

export default App;
