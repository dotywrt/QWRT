module("luci.controller.modeminfo", package.seeall)

function index()
	entry({"admin", "modem"}, firstchild(), _("Modem"), 40).dependent = false
	entry({"admin", "modem", "modeminfo"}, call("action_modeminfo"), _("Modem Info"), 20).dependent = false
	entry({"admin", "modem", "modeminfo", "get_info"}, call("get_modem_info")).dependent = false
	entry({"admin", "modem", "modeminfo", "get_device_info"}, call("get_device_info")).dependent = false  -- BARU
	entry({"admin", "modem", "modeminfo", "set_refresh"}, call("set_refresh")).dependent = false
	entry({"admin", "modem", "modeminfo", "get_ports_info"}, call("get_ports_info")).dependent = false
	entry({"admin", "modem", "modeminfo", "save_port"}, call("save_port")).dependent = false
end

local function read_modeminfo_file()
	local modeminfo = {}
	local file = io.open("/tmp/modeminfo", "r")

	if file then
		for line in file:lines() do
			local key, value = line:match("^(.-):%s*(.*)$")
			if key and value then
				modeminfo[key] = value
			end
		end
		file:close()
	end

	return modeminfo
end

local function safe_run_modeminfo()
	luci.sys.call("/bin/sh /usr/bin/modeminfo >/dev/null 2>&1")
end

local function valid_refresh_rate(rate)
	local allowed = {
		["2"] = true,
		["5"] = true,
		["7"] = true,
		["10"] = true,
		["15"] = true
	}
	return allowed[tostring(rate or "")] == true
end

local function valid_comm_port(port)
	if not port then
		return false
	end

	if port:match("^/dev/ttyUSB%d+$") or port:match("^/dev/ttyACM%d+$") then
		return true
	end

	return false
end

function action_modeminfo()
	local uci = require "luci.model.uci".cursor()

	safe_run_modeminfo()

	local refresh_rate = uci:get("modeminfo", "settings", "refresh_rate") or "5"
	if not valid_refresh_rate(refresh_rate) then
		refresh_rate = "5"
	end

	local saved_comm = uci:get("modeminfo", "settings", "comm") or "/dev/ttyUSB3"

	luci.template.render("modeminfo", {
		modeminfo = read_modeminfo_file(),
		refresh_rate = refresh_rate,
		saved_comm = saved_comm
	})
end

function get_ports_info()
	local fs = require "nixio.fs"
	local uci = require "luci.model.uci".cursor()
	local available_ports = {}

	for file in fs.dir("/dev") do
		if file:match("^ttyUSB%d+$") or file:match("^ttyACM%d+$") then
			available_ports[#available_ports + 1] = "/dev/" .. file
		end
	end

	table.sort(available_ports)

	local saved_comm = uci:get("modeminfo", "settings", "comm") or "/dev/ttyUSB3"

	luci.http.prepare_content("application/json")
	luci.http.write_json({
		ports = available_ports,
		default_port = saved_comm
	})
end

function save_port()
	local uci = require "luci.model.uci".cursor()
	local http = require "luci.http"

	local selected_port = http.formvalue("commport")

	if selected_port and valid_comm_port(selected_port) then
		if not uci:get("modeminfo", "settings") then
			uci:section("modeminfo", "settings", "settings")
		end

		uci:set("modeminfo", "settings", "comm", selected_port)
		uci:commit("modeminfo")

		safe_run_modeminfo()
	end

	http.redirect(luci.dispatcher.build_url("admin/modem/modeminfo"))
end

function set_refresh()
	local uci = require "luci.model.uci".cursor()
	local http = require "luci.http"

	local refresh_rate = http.formvalue("refresh_rate")

	if valid_refresh_rate(refresh_rate) then
		if not uci:get("modeminfo", "settings") then
			uci:section("modeminfo", "settings", "settings")
		end

		uci:set("modeminfo", "settings", "refresh_rate", refresh_rate)
		uci:commit("modeminfo")
	end

	http.redirect(luci.dispatcher.build_url("admin/modem/modeminfo"))
end

function get_modem_info()
	safe_run_modeminfo()

	luci.http.prepare_content("application/json")
	luci.http.write_json(read_modeminfo_file())
end

function get_device_info()
	local model = "Unknown"
	local fd = io.open("/tmp/sysinfo/model", "r")
	if fd then
		model = fd:read("*all"):gsub("%s+$", "")
		fd:close()
	end
	
	local hostname = "Unknown"
	local fd2 = io.open("/proc/sys/kernel/hostname", "r")
	if fd2 then
		hostname = fd2:read("*all"):gsub("%s+$", "")
		fd2:close()
	end
	
	local system = "Unknown"
	local fd3 = io.open("/proc/cpuinfo", "r")
	if fd3 then
		for line in fd3:lines() do
			if line:match("^Hardware") or line:match("^model name") or line:match("^Processor") then
				system = line:match(": (.+)") or "Unknown"
				break
			end
		end
		fd3:close()
	end
	
	if system == "Unknown" then
		local fd3b = io.open("/proc/device-tree/model", "r")
		if fd3b then
			system = fd3b:read("*all"):gsub("%s+$", "")
			fd3b:close()
		end
	end
	 
	local openwrt_version = "Unknown"
	local fd4 = io.open("/etc/openwrt_release", "r")
	if fd4 then
		for line in fd4:lines() do
			if line:match("DISTRIB_DESCRIPTION=") then
				local full_version = line:gsub('DISTRIB_DESCRIPTION="(.*)"', '%1')
				-- Ambil hanya "ImmortalWrt 24.10.6" (hapus r37654-e625a070981f)
				openwrt_version = full_version:match("([%w]+ [%d%.]+)") or full_version
				break
			end
		end
		fd4:close()
	end
	
	local kernel_version = "Unknown"
	local fd5 = io.open("/proc/version", "r")
	if fd5 then
		local content = fd5:read("*all")
		fd5:close()
		kernel_version = content:match("Linux version ([%d.]+)") or "Unknown"
	end
	
	local storage_root = "Unknown"
	local df_handle = io.popen("df -h /overlay 2>/dev/null | tail -n1")
	if df_handle then
		local df_output = df_handle:read("*all")
		df_handle:close()
		local used, avail, use_pct = df_output:match("%s+%S+%s+([%d.]+[GMK]?)%s+([%d.]+[GMK]?)%s+([%d]+)%s*%%")
		if not used then
			used, avail, use_pct = df_output:match("%s+([%d.]+[GMK]?)%s+([%d.]+[GMK]?)%s+([%d]+)%%")
		end
		if used and avail then
			storage_root = used .. " / " .. avail .. " (" .. (use_pct or "?") .. "%)"
		end
	end
	
	luci.http.prepare_content("application/json")
	luci.http.write_json({
		model = model,
		hostname = hostname,
		system = system,
		openwrt_version = openwrt_version,
		kernel_version = kernel_version,
		storage_root = storage_root
	})
end
