import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class SpellCheckService {

    constructor(private config: ConfigService){
        
    }

    async correct(text: string, lang: string = 'en'): Promise<string> {
        const serviceUrl = this.config.get<string>('SPELL_CHECK_SERVICE_URL', '');
        const serviceEnabled = this.config.get<boolean>('SPELL_CHECK_ENABLED', false);
        let correctText = text;

        if (!serviceUrl || !serviceEnabled) {
            return correctText;
        }
        try {
           const response =  await axios.post(serviceUrl, { text, lang });
           correctText = response.data.corrected;
           return correctText;
        } catch (error) {
            return correctText;
        }
        
    }
}
