import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class SpellCheckService {

    constructor(
        private config: ConfigService,
        @InjectPinoLogger(SpellCheckService.name) private readonly logger: PinoLogger){
        
    }

    /**
     * Check spell of a given text in the specified target language.
     * 
     * @param {string} text - The input text to be checked
     * @param {string} language - The target language code (default is 'en') 
     * @returns {Promise<string>} A promise resolving to the corrected text
     */
    async correct(text: string, language: string = 'en'): Promise<string> {
        const serviceUrl = this.config.get<string>('SPELL_CHECK_SERVICE_URL', '');
        const serviceEnabled = this.config.get<boolean>('SPELL_CHECK_ENABLED', false);
        let correctText = text;
        
        //If service is not enabled or service url is not defined, return input string
        if (!serviceUrl || !serviceEnabled) {
            return correctText;
        }
        try {
            this.logger.debug(`Attempting to check splle ${text} from ${language} language`);
           const response =  await axios.post(serviceUrl, { text, language });
           correctText = response.data.corrected;
           this.logger.info(`${text} checked successfully to ${correctText}`);
           return correctText;
        } catch (error) {
            this.logger.error({ error: error.message, stack: error.stack }, 'Sell Check API error.');
            return correctText;
        }
        
    }
}
