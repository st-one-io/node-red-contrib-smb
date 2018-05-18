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

        self.writeFile = function writeFile(fileName, data, callback){

            let writeFile = self.smbClient.writeFile(fileName, data);

            writeFile.then(() => {
                callback(null);
            });

            writeFile.catch((err) => {
                callback(err);
                connect();
            });
        };

        self.mkdir = function mkdir(path, callback){

            let mkdir = self.smbClient.mkdir(path);

            mkdir.then(() => {
                callback(null);
            });

            mkdir.catch((err) => {
                callback(err);
                connect();
            });
        };

        self.rmdir = function rmdir(path, callback){

            let rmdir = self.smbClient.rmdir(path);

            rmdir.then(() => {
                callback(null);
            });

            rmdir.catch((err) => {
                callback(err);
                connect();
            });
        };

        self.exists = function exists(path, callback){

            let exists = self.smbClient.exists(path);

            exists.then(() => {
                callback(null);
            });

            exists.catch((err) => {
                callback(err);
                connect();
            });
        };

        self.ensureDir = function ensureDir(path, callback){

            let ensureDir = self.smbClient.ensureDir(path);

            ensureDir.then(() => {
                callback(null);
            });

            ensureDir.catch((err) => {
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

        node.statusProcess = function statusProcess(){
            node.status({
                fill: "blue",
                shape: "dot",
                text: "process"
            });
        };

        node.statusDone = function statusDone(){
            node.status({
                fill: "green",
                shape: "dot",
                text: "done"
            });
        };

        node.statusError = function statusError(){
            node.status({
                fill: "red",
                shape: "dot",
                text: "error"
            });
        };

        node.on("input", (msg) => {

            let fileName = "";

            if(msg.hasOwnProperty("filename")){
                fileName = msg.filename;
            }

            let filename = node.path || fileName;

            switch (node.operation) {

                case "read-dir":

                    node.statusProcess();

                    node.config.readDir(filename, (err, files) => {
                        
                        if(err){
                            node.statusError();
                            node.error(err);
                            return;
                        }

                        node.statusDone();
                        msg.payload = files;
                        node.send(msg);
                    });

                    break;

                case "read-file":

                    node.statusProcess();

                    node.config.readFile(filename, (err, data) => {
                        
                        if(err){
                            node.statusError();
                            node.error(err);
                            return;
                        }

                        node.statusDone();
                        msg.payload = data;
                        node.send(msg);
                    });       
                
                    break;

                case "unlink":

                    node.statusProcess();

                    node.config.unlink(filename, (err) => {

                        if(err){
                            node.statusError();                            
                            node.error(err);
                            return;
                        }

                        node.statusDone();
                        node.send(msg);
                    });

                    break;

                case "rename":

                    let newFileName = "";

                    if(msg.hasOwnProperty("new_filename")){
                        newFileName = msg.new_filename;
                    }

                    let new_filename = node.newPath || newFileName;

                    node.statusProcess();

                    node.config.rename(filename, new_filename, (err) =>{
                        
                        if(err){
                            node.statusError();
                            node.error(err);
                            return;
                        }

                        node.statusDone();
                        node.send(msg);
                    });

                    break;

                case "create":

                    let data = "";
                    
                    if(msg.hasOwnProperty("payload")){
                        data = msg.payload;
                    }                    
                    
                    node.statusProcess();

                    node.config.writeFile(filename, data, (err) => {
                        
                        if(err){
                            node.statusError();
                            node.error(err);
                            return;
                        }

                        node.statusDone();
                        node.send(msg);
                    });

                    break;

                case "mkdir":

                    node.statusProcess();

                    node.config.mkdir(filename, (err) => {
                        
                        if(err){
                            node.statusError();
                            node.error(err);
                            return;
                        }

                        node.statusDone();
                        node.send(msg);
                    });

                    break;

                case "rmdir":

                    node.statusProcess();

                    node.config.rmdir(filename, (err) => {
                        
                        if(err){
                            node.statusError();
                            node.error(err);
                            return;
                        }

                        node.statusDone();
                        node.send(msg);
                    });

                    break;

                case "exists":

                    node.statusProcess();

                    node.config.exists(filename, (err) => {
                        
                        if(err){
                            node.statusError();
                            node.error(err);
                            return;
                        }

                        node.statusDone();
                        node.send(msg);
                    });

                    break;

                case "ensure-dir":

                    node.statusProcess();

                    node.config.ensureDir(filename, (err) => {
                        
                        if(err){
                            node.statusError();
                            node.error(err);
                            return;
                        }

                        node.statusDone();
                        node.send(msg);
                    });

                    break;
            }

        });
    }
    RED.nodes.registerType("SMB", SmbFunction);
};