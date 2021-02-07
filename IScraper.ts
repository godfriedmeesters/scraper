export interface IScraper {
    scrapeUntilSearch: (inputData: any) => any;
    scrapeFromSearch: (inputData: any) => void;
    startClient:  (params: any) => Promise<any>;
    stopClient:(params: any) => Promise<any>;
}
