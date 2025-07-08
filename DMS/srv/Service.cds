using { DMS.DocumentManagementSystem as DMS } from '../db/Schema';

service DMSService {

    entity Folder as projection on DMS.Folder;
    entity File as projection on DMS.File;
    action getFileContent() returns String;

}