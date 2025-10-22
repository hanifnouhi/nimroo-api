import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import mongoose, { Document } from "mongoose";

@Schema()
export class Card {
    @Prop({ lowercase: true, required: true })
    title: string;

    //image url
    @Prop({ lowercase: true })
    image?: string;

    @Prop({ lowercase: true, required: true })
    meaning: string;

    //works like a category for cards
    @Prop({ 
        type: [String], 
        required: true,
        validate: [(val: string[]) => val.length > 0, 'Array must contain at least one item']
    })
    tags: string[];

    //utilisation examples of title
    @Prop({ type: [String], required: false })
    examples: string[];

    @Prop({ type: [String], required: false })
    synonyms: string[];

    @Prop({ required: false })
    description: string;

    @Prop({ type: [String], required: false })
    opposites: string[];

    @Prop({ required: false })
    category: string;

    @Prop({ default: 1 })
    order: number;

    @Prop({ default: true })
    visible: boolean;

    @Prop({ enum: ['easy', 'normal', 'hard'], default: 'normal' })
    difficulty: string;

    @Prop({ required: false })
    hint: string;

    @Prop({ default: () => Date.now()})
    createdAt: Date;

    @Prop({ default: 1 })
    reviewCount: number;

    @Prop({ required: false })
    lastReviewdAt: Date;

    @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
    user: mongoose.Types.ObjectId;
}

export type CardDocument = Card & Document;

export const CardSchema = SchemaFactory.createForClass(Card);

CardSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

CardSchema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform: (_, ret: Record<string, any>) => {
        if ('_id' in ret) {
            delete ret._id;
        }
    }
})