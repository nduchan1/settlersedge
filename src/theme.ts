import { createTheme } from '@mui/material/styles';

/** Dark parchment-and-gold, Travian-flavored. */
export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#d9a441' },
    secondary: { main: '#7fb069' },
    background: { default: '#171310', paper: '#211b15' },
  },
  typography: {
    fontFamily: 'Georgia, "Times New Roman", serif',
    h4: { fontWeight: 700, letterSpacing: 1 },
  },
  shape: { borderRadius: 10 },
});
