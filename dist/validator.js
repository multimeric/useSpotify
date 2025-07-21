export class SpotifyApiError extends Error {
    statusCode;
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
}
export const responseValidator = {
    validateResponse: async (response) => {
        if (!response.status.toString().startsWith("2")) {
            throw new SpotifyApiError(response.statusText, response.status);
        }
    }
};
