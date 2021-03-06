import $ from "jquery";
import _ from "lodash";
import * as sites from "./site_helper";

export interface SiteItem {
    service: string;
    name: string;
}

let loaded = false;
let sitelist: string[] = [];
let blocklist: SiteItem[] = [];


$(document).ready(() => {
    $("#connect_twitch").attr("href", sites.Twitch.GetOauthUrl());
    $("#enable_twitch").change((e) => {
        update_sitelist("Twitch", $(e.target).prop("checked"));
    });
    $("#connect_picarto").attr("href", sites.Picarto.GetOauthUrl());
    $("#enable_picarto").change((e) => {
        update_sitelist("Picarto", $(e.target).prop("checked"));
    });
    $("#filter_add").click(() => {
        const service = $("#filter_add_service").val() as string;
        const name_field = $("#filter_add_name");
        const name = (name_field.val() as string)?.toLowerCase();
        add_blocklist(service, name);
        name_field.val("");
    });
});


function add_blocklist(service: string, name: string) {
    if (!loaded) return;

    const item = { service, name };

    if (_.find(blocklist, item)) {
        return;
    }

    blocklist.push(item);

    console.log("Setting blocklist to", blocklist);
    chrome.storage.sync.set({ "user.blacklist": blocklist });
}


function remove_blocklist(service: string, name: string) {
    const item = { service, name };

    _.pull(blocklist, _.find(blocklist, item));

    console.log("Setting blocklist to", blocklist);
    chrome.storage.sync.set({ "user.blacklist": blocklist });
}


function update_blocklist(list: SiteItem[]) {
    blocklist = list || [];

    const tbody = $("table#filter_table tbody#filter_body");
    tbody.empty();

    for (const item of list) {
        const row = $("<tr>");

        $("<td>").text(item.service).appendTo(row);
        $("<td>").text(item.name).appendTo(row);
        const removeButton = $("<input>").attr("type", "button").val("-").data("item", item).click((e) => {
            const target = $(e.target);
            const i = target.data("item");
            remove_blocklist(i.service, i.name);
        });
        $("<td>").append(removeButton).appendTo(row);

        tbody.append(row);
    }
}


function update_sitelist(name: string, state: boolean) {
    if (!loaded) return;

    if (!state) {
        _.pull(sitelist, name);
    } else {
        sitelist.push(name);
    }

    console.log("Setting sitelist to", sitelist);
    chrome.storage.sync.set({ sitelist });
}

export interface SettingsKeys {
    "oauth.twitch": string;
    "oauth.picarto": string;
    "sitelist": string[];
    "user.blacklist": SiteItem[];
}

function update_vars(keys: SettingsKeys) {
    Object.keys(keys).forEach((key) => {
        if (key === "oauth.twitch") {
            const value = keys[key];
            if (value) {
                $("#twitch_status").show();
                $("#connect_twitch").hide();
            } else {
                $("#twitch_status").hide();
                $("#connect_twitch").show();
            }
        } else if (key === "oauth.picarto") {
            const value = keys[key];
            if (value) {
                $("#picarto_status").show();
                $("#connect_picarto").hide();
            } else {
                $("#picarto_status").hide();
                $("#connect_picarto").show();
            }
        } else if (key === "sitelist") {
            const value = keys[key];
            sitelist = value || [];
            $("#enable_twitch").prop("checked", _.includes(value, "Twitch"));
            $("#enable_picarto").prop("checked", _.includes(value, "Picarto"));
        } else if (key === "user.blacklist") {
            const value = keys[key];
            update_blocklist(value);
        }
    });

    loaded = true;
}


chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "sync") {
        const vals = _.mapValues(changes, (val) => {
            return val.newValue;
        }) as SettingsKeys;

        update_vars(vals);
    }
});


chrome.storage.sync.get(["sitelist", "user.blacklist", "oauth.twitch", "oauth.picarto"], (k) => update_vars(k as SettingsKeys));
