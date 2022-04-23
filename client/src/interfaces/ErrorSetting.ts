export interface ErrorSetting {
    readonly errorMessage?: string;
    setErrorMessage: (errorMessage?: string) => void;
}
