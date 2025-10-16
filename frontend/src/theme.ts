import { extendTheme, ThemeConfig } from '@chakra-ui/react';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: false,
};

export const theme = extendTheme({
  config,
  styles: {
    global: {
      body: {
        backgroundColor: '#f8fafc',
      },
      'input, select, textarea': {
        borderRadius: '8px',
        borderColor: '#cbd5f5',
        padding: '0.65rem',
        width: '100%',
      },
      'input:focus, select:focus, textarea:focus': {
        outline: '2px solid #4299e1',
        boxShadow: '0 0 0 1px #4299e1',
        borderColor: '#4299e1',
      },
    },
  },
});

