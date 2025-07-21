import { IValidateResponses } from "@spotify/web-api-ts-sdk";
export declare class SpotifyApiError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number);
}
export declare const responseValidator: IValidateResponses;
