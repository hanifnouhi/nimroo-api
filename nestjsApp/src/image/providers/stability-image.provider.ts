import { Injectable } from "@nestjs/common";
import { ImageGenerateProvider } from "./image-provider.interface";
import { ImageGenerateResult } from "./image-generate-result.interface";
import { ConfigService } from "@nestjs/config";
import axios from "axios";
import * as FormData from "form-data";

@Injectable()
export class StabilityImageProvider implements ImageGenerateProvider {
    private endpoint: string;
    private model: string;
    private apiKey: string;

    constructor(
        private readonly configService: ConfigService
    ) {
        this.endpoint = this.configService.getOrThrow<string>('STABILITY_IMAGE_GENERATE_URL');
        this.model = this.configService.getOrThrow<string>('STABILITY_IMAGE_GENERATE_MODEL');
        this.apiKey = this.configService.getOrThrow<string>('STABILITY_IMAGE_GENERATE_API_KEY');
    }

    async generate(text: string): Promise<ImageGenerateResult> {

        const formData = new FormData();
        formData.append('prompt', text);
        formData.append('model', this.model);
        formData.append('output_format', 'jpeg');

        try {
            const response = await axios.post(
                this.endpoint,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                        Authorization: `Bearer ${this.apiKey}`,
                        Accept: 'application/json',
                    },
                    responseType: 'json',
                    timeout: 30000,
                }
            );
            return { image: response.data.image };
        } catch (error) {
            throw error;
        }
        
        
    }
}