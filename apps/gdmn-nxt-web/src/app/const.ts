export const baseUrl = `http://${process.env.NODE_ENV === 'development' ? 'localhost' : process.env.NX_HOST_IP}:4444/`;
export const baseUrlApi = `${baseUrl}api/v1/`;
