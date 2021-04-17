export interface IScraper {
    scrapeUntilSearch: (inputData: any) => Promise<any>;
    scrapeFromSearch: (inputData: any) => void;
    startClient: (params: any) => Promise<any>;
    stopClient: (params: any) => Promise<any>;
    takeScreenShot: (className: String) => Promise<any>;
    saveContent:(className: String) => Promise<any>;
}
