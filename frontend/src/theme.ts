import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        backgroundColor: "#f8fafc",
      },
      "input, select, textarea": {
        borderRadius: "8px",
        border: "1px solid #CBD5F5",
        backgroundColor: "#FFFFFF",
        color: "#1A202C",
        padding: "0.65rem",
        width: "100%",
        transition: "border-color 0.2s ease, box-shadow 0.2s ease",
      },
      "input:focus, select:focus, textarea:focus": {
        outline: "2px solid #4299e1",
        boxShadow: "0 0 0 1px #4299e1",
        borderColor: "#4299e1",
      },
      "input[type='checkbox']": {
        width: "auto",
        marginRight: "0.5rem",
        cursor: "pointer",
      },
      ".chakra-form-field table": {
        width: "100%",
        borderCollapse: "separate",
        borderSpacing: 0,
        border: "1px solid #CBD5E0",
        borderRadius: "8px",
        backgroundColor: "#F8FAFC",
        overflow: "hidden",
        boxShadow: "0 1px 2px rgba(45, 55, 72, 0.08)",
      },
      ".chakra-form-field th, .chakra-form-field td": {
        padding: "0.75rem",
        borderBottom: "1px solid #E2E8F0",
        color: "#2D3748",
      },
      ".chakra-form-field th": {
        backgroundColor: "#EDF2F7",
        fontWeight: 600,
        textAlign: "left",
      },
      ".chakra-form-field td": {
        backgroundColor: "#FFFFFF",
      },
      ".chakra-form-field tr:last-of-type td": {
        borderBottom: "none",
      },
      ".chakra-form-field tr:hover td": {
        backgroundColor: "#F1F5F9",
      },
    },
  },
});
