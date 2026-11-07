import React from "react";
import { RouterProvider } from "react-router-dom";
import { router } from "./configs/route";
import { AuthProvider } from "./context/AuthContext";
import { StoreProvider } from "./context/StoreContext";
import { ThemeProvider } from "./context/ThemeContext";
import "./App.css";

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StoreProvider>
          <RouterProvider router={router} />
        </StoreProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
