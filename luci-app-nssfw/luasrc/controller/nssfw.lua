module("luci.controller.nssfw", package.seeall)

function index()
	entry({"admin", "status", "nssfw"}, call("action_index"), _("NSS Info"), 90)
	entry({"admin", "status", "nssfw", "data"}, call("action_data")).leaf = true
	entry({"admin", "status", "nssfw", "set_interval"}, call("action_set_interval")).leaf = true
end

function action_index()
	local uci = require("luci.model.uci").cursor()
	local interval = uci:get("nssfw", "main", "interval") or "5"

	luci.template.render("nssfw/index", {
		interval = interval
	})
end

function action_data()
	local data = require("luci.model.nssfw").get_data()
	luci.http.prepare_content("application/json")
	luci.http.write_json(data)
end

function action_set_interval()
	local http = require("luci.http")
	local uci  = require("luci.model.uci").cursor()

	local interval = http.formvalue("interval") or "5"
	if interval ~= "5" and interval ~= "10" and interval ~= "15" then
		interval = "5"
	end

	if not uci:get("nssfw", "main") then
		uci:section("nssfw", "nssfw", "main", { interval = interval })
	else
		uci:set("nssfw", "main", "interval", interval)
	end

	uci:save("nssfw")
	uci:commit("nssfw")

	http.prepare_content("application/json")
	http.write_json({ success = true, interval = interval })
end
