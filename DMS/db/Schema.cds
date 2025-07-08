namespace DMS.DocumentManagementSystem;

@assert.unique: {
    // PathConstraint: [ Path ], 
    NameConstraint: [ ParentFolder, Name ] 
}
entity Folder {
    key FolderUUID           : UUID;
    Name             : String;
    ParentFolder     : Association to one Folder; 
    Path             : String; 
    CreatedAt        : Timestamp;
    CreatedBy        : String;

    SubFolders :composition of many Folder on SubFolders.ParentFolder = $self;
    AllFiles : composition of many File on AllFiles.Folder = $self;
}

entity File {
    key FileUUID              : UUID;
    FileName    : String;  
    SystemFileName      : String;  

    @Core.IsMediaType : true
    FileType            : String; 

    FileSize            : Integer @Measures.Unit: 'byte';

    @Core.ContentDisposition.Filename: FileName
    @Core.ContentDisposition.Type:FileType
    @Core.MediaType : FileType
    FileContent         : LargeBinary; 

    FileURL             : String;
    UploadedAt          : Timestamp;
    UploadedBy          : String;
    Folder              : Association to Folder;
    FolderPath          : String = Folder.Path; 
}
