// Define el contrato de lo que cada cliente puede personalizar
export interface TenantConfig {
  theme: {
    primaryColor: string;
    secondaryColor: string;
  };
}

// Mock inicial del hook (luego esto vendrá de un Context/API)
export const useConfig = (): TenantConfig => ({
  theme: {
    primaryColor: "#0070f3",
    secondaryColor: "#ff4081"
  }
});