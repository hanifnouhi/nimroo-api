import { MembershipFeature, MembershipPlan } from "../../user/user.enums";

// For ignoring membership plans set DISABLE_MEMBERSHIP_SYSTEM in env file to true
// All numbers show requests limit per day
export const PLANS_CONFIG = {
    [MembershipPlan.FREE]: {
        [MembershipFeature.CLOUD_STORAGE]: false,
        [MembershipFeature.CLOUD_SYNC]: false,
        [MembershipFeature.TRANSLATION]: 0,
        [MembershipFeature.IMAGE_SEARCH]: 0,
        [MembershipFeature.IMAGE_GENERATION]: 0,
        [MembershipFeature.LLM_TEXTDATA]: 0,
        [MembershipFeature.CARD_CREATE]: 10000
    },
    [MembershipPlan.BASIC]: {
        [MembershipFeature.CLOUD_STORAGE]: false,
        [MembershipFeature.CLOUD_SYNC]: false,
        [MembershipFeature.TRANSLATION]: 200,
        [MembershipFeature.IMAGE_SEARCH]: 20,
        [MembershipFeature.IMAGE_GENERATION]: 0,
        [MembershipFeature.LLM_TEXTDATA]: 0,
        [MembershipFeature.CARD_CREATE]: 20
    },
    [MembershipPlan.MID]: {
        [MembershipFeature.CLOUD_STORAGE]: true,
        [MembershipFeature.CLOUD_SYNC]: true,
        [MembershipFeature.TRANSLATION]: 500,
        [MembershipFeature.IMAGE_SEARCH]: 60,
        [MembershipFeature.IMAGE_GENERATION]: 10,
        [MembershipFeature.LLM_TEXTDATA]: 30,
        [MembershipFeature.CARD_CREATE]: 30
    },
    [MembershipPlan.FULL]: {
        [MembershipFeature.CLOUD_STORAGE]: true,
        [MembershipFeature.CLOUD_SYNC]: true,
        [MembershipFeature.TRANSLATION]: 1000,
        [MembershipFeature.IMAGE_SEARCH]: 200,
        [MembershipFeature.IMAGE_GENERATION]: 100,
        [MembershipFeature.LLM_TEXTDATA]: 100,
        [MembershipFeature.CARD_CREATE]: 100
    },
}