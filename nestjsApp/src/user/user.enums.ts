export enum UserRole {
    Admin = 'admin',
    User = 'user',
    Moderator = 'moderator'
}

export enum UserStatus {
    Active = 'active',
    Suspender = 'suspended',
    Deleted = 'deleted'
}

export enum UserGoal {
    Language = 'language',
    General = 'general'
}

export enum UserProvider {
    Local = 'local',
    Google = 'google',
    Apple = 'apple',
    MicroSoft = 'microsoft',
    Facebook = 'facebook',
    LinkedIn = 'linkedin'
}

export enum MembershipPlan {
    FREE = 'free',
    BASIC = 'basic',
    MID = 'mid',
    FULL = 'full'
}

export enum MembershipFeature {
    TRANSLATION = 'translation',
    IMAGE_SEARCH = 'image_search',
    IMAGE_GENERATION = 'image_generation',
    LLM_TEXTDATA = 'llm_textdata',
    CARD_CREATE = 'card_create',
    CLOUD_SYNC = 'cloud_sync',
    CLOUD_STORAGE = 'cloud_storage'
}