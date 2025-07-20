import { IValidateResponses } from "@spotify/web-api-ts-sdk";


export class SpotifyApiError extends Error {
    constructor(message: string, public statusCode: number) {
        super(message);
    }
}

export const responseValidator: IValidateResponses = {
    validateResponse: async (response) => {
        if (!response.status.toString().startsWith("2")) {
            throw new SpotifyApiError(response.statusText, response.status);
        }
    }
};
