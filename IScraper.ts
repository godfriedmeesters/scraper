export interface IScraper {
    scrapeUntilSearch: (inputData: any) => any;
    scrapeFromSearch: (inputData: any) => void;
    startClient:  () => Promise<any>;
    stopClient:() => Promise<any>;
}
