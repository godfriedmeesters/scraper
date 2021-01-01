export interface IScraper {
    scrapeUntilSearch: (inputData: any) => any;
    scrapeFromSearch: (inputData: any) => void;
    startClient:  (params: any) => Promise<any>;
    stopClient:() => Promise<any>;
}
