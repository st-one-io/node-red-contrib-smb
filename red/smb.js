/*
Copyright 2018 Smart-Tech Controle e Automação
Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at
    http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
/* jshint node: true, esversion: 6 */
"use strict";

const SMB = require('@tracker1/smb2');

module.exports = function (RED) {

    function SmbConfig(values) {

        let self = this;

        RED.nodes.createNode(self, values);

        self.share = values.share;
        self.domain = values.domain || ".";
        self.username = self.credentials.username;
        self.password = self.credentials.password;
        self.autoCloseTimeout = 0;
   
        self.on("close", (done) => {
            self.smbClient.close();
            done();
        });

        function connect (){
            
            if(self.smbClient){
                self.smbClient.close();
            }            
            
            self.smbClient = new SMB({
                share: self.share,
                domain: self.domain,
                username: self.username,
                password: self.password,
                autoCloseTimeout: 0
            });
        }

        connect();

        if (!self.smbClient) {
            self.error("Error smbClient not available");
            return;
        }

        self.readDir = function readDir(path, callback) {
            let readdir = self.smbClient.readdir(path);

            readdir.then((data) => {
                callback(null, data);
            });

            readdir.catch((err) => {
                callback(err);
                connect();
            });
        };

        self.readFile = function readFile(path, callback) {
            let readFile = self.smbClient.readFile(path, {encoding: "utf8"});

            readFile.then((data) => {
                callback(null, data);
            });

            readFile.catch((err) => {
                callback(err);
                connect();
            });
        };

        self.unlink = function unlink(path, callback) {
            
            let unlink = self.smbClient.unlink(path);
            
            unlink.then(() =>{
                callback(null);
            });
            
            unlink.catch((err) => {
                callback(err);
                connect();
            });

        };

        self.rename = function rename(oldPath, newPath, callback) {
            
            let rename = self.smbClient.rename(oldPath, newPath);

            rename.then(() => {
                callback(null);
            });

            rename.catch((err) => {
                callback(err);
                connect();
            });
        };

    }
    RED.nodes.registerType("smb config", SmbConfig, {
        credentials: {
            username: {type:"text"},
            password: {type:"password"}
        }
    });

    function SmbFunction(values) {

        let node = this;

        RED.nodes.createNode(node, values);

        node.config = RED.nodes.getNode(values.config);
        node.operation = values.operation;
        node.path = values.path;
        node.newPath = values.path_new;


        if (!node.config) {
            node.error("SBM not configuration");
            return;
        }

        node.on("input", (msg) => {

            let path = node.path || msg.payload;

            switch (node.operation) {
                
                case "read-dir":

                    node.config.readDir(path, (err, files) => {
                        if(err){
                            node.error(err);
                            return;
                        }

                        msg.payload = files;
                        node.send(msg);
                    });

                    break;

                case "read-file":

                    node.config.readFile(path, (err, data) => {
                        if(err){
                            node.error(err);
                            return;
                        }

                        msg.payload = data;
                        node.send(msg);
                    });       
                
                    break;

                case "unlink":

                    node.config.unlink(path, (err) => {
                        if(err){
                            node.error(err);
                            return;
                        }

                        node.log("Success Remove");
                    });

                    break;

                case "rename":

                    let obj = msg.payload;

                    node.config.rename(obj.currently, obj.new, (err) =>{
                        if(err){
                            node.error(err);
                            return;
                        }

                        node.log("Success Rename/Move");
                    });

                    break;
            }
        });


    }
    RED.nodes.registerType("SMB", SmbFunction);

};