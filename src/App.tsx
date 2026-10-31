import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./configs/route";
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import "./App.css";

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <StoreProvider>
        <RouterProvider router={router} />
      </StoreProvider>
    </AuthProvider>
  );
};

export default App;
