module("luci.model.nssfw", package.seeall)

local fs = require("nixio.fs")

local function trim(s)
	if not s then
		return nil
	end
	return (s:gsub("^%s+", ""):gsub("%s+$", ""))
end

local function readfile(path)
	local v = fs.readfile(path)
	if not v then
		return nil
	end
	return trim(v)
end

local function startswith(str, prefix)
	return str and prefix and str:sub(1, #prefix) == prefix
end

local function parse_temp(temp_str)
	if not temp_str then
		return nil
	end

	local digits = temp_str:gsub("%D", "")
	if digits == "" then
		return nil
	end

	return tonumber(digits) / 1000
end

local function get_nss_load()
	local path = "/sys/kernel/debug/qca-nss-drv/stats/cpu_load_ubi"

	if not fs.access(path) then
		return nil
	end

	for line in io.lines(path) do
		if line:find("%%") then
			local vals = {}
			for tok in line:gmatch("%S+") do
				vals[#vals + 1] = tok
			end

			if #vals >= 3 then
				return {
					min = vals[1],
					avg = vals[2],
					max = vals[3]
				}
			end
		end
	end

	return nil
end

local function get_thermal_zones()
	local base = "/sys/class/thermal"
	local zones = {}

	if not fs.access(base) then
		return zones
	end

	for name in fs.dir(base) do
		if startswith(name, "thermal_zone") then
			local type_name = readfile(base .. "/" .. name .. "/type")
			local temp_str = readfile(base .. "/" .. name .. "/temp")
			local temp = parse_temp(temp_str)
			local category = nil

			if type_name and temp then
				type_name = type_name:lower()

				if startswith(type_name, "cpu") then
					category = "CPU"
				elseif startswith(type_name, "nss") then
					category = "Core"
				elseif startswith(type_name, "wcss") then
					category = "WiFi"
				end

				if category then
					zones[#zones + 1] = {
						category = category,
						temp = temp
					}
				end
			end
		end
	end

	return zones
end

local function process_thermal_zones(zones)
	local result = {}

	for _, z in ipairs(zones) do
		local item = result[z.category]
		if not item then
			item = {
				min = z.temp,
				max = z.temp,
				sum = 0,
				count = 0
			}
			result[z.category] = item
		end

		if z.temp < item.min then item.min = z.temp end
		if z.temp > item.max then item.max = z.temp end
		item.sum = item.sum + z.temp
		item.count = item.count + 1
	end

	local out = {}
	for category, item in pairs(result) do
		out[category] = {
			min = string.format("%.1f°", item.min),
			avg = string.format("%.1f°", item.sum / item.count),
			max = string.format("%.1f°", item.max)
		}
	end

	return out
end

local function parse_interface_line(line)
	if not line then
		return nil
	end

	line = trim(line)
	if not line or line == "" then
		return nil
	end

	line = line:gsub("^%s+", "")

	local name, tx, rx = line:match("^(%S+)%s+tx%-checksumming:%s*(%S+)%s+rx%-gro%-list:%s*(%S+)")
	if name then
		return {
			name = name,
			tx = tx,
			rx = rx
		}
	end

	return nil
end

local function get_nss_diag()
	local pipe = io.popen("nss_diag 2>/dev/null")
	if not pipe then
		return nil
	end

	local raw = pipe:read("*a") or ""
	pipe:close()

	if raw == "" then
		return nil
	end

	local info = {
		device = nil,
		kernel = nil,
		cpu_mode = nil,
		system = nil,
		nss_fw = nil,
		mac80211 = nil,
		ath11k_fw = nil,
		interfaces = {}
	}

	local section = "main"

	for line in raw:gmatch("[^\r\n]+") do
		local l = trim(line)

		if l and l ~= "" then
			if l:match("^DEVICE:") then
				info.device = trim(l:match("^DEVICE:%s*(.*)$"))
				section = "main"

			elseif l:match("^KERNEL:") then
				info.kernel = trim(l:match("^KERNEL:%s*(.*)$"))
				section = "main"

			elseif l:match("^CPU MODE:") then
				info.cpu_mode = trim(l:match("^CPU MODE:%s*(.*)$"))
				section = "main"

			elseif l:match("^SYSTEM:") then
				info.system = trim(l:match("^SYSTEM:%s*(.*)$"))
				section = "main"

			elseif l:match("^NSS FW:") then
				info.nss_fw = trim(l:match("^NSS FW:%s*(.*)$"))
				section = "main"

			elseif l:match("^MAC80211:") then
				info.mac80211 = trim(l:match("^MAC80211:%s*(.*)$"))
				section = "main"

			elseif l:match("^ATH11K FW:") then
				info.ath11k_fw = trim(l:match("^ATH11K FW:%s*(.*)$"))
				section = "main"

			elseif l:match("^INTERFACE:") then
				section = "interfaces"

				local first = trim(l:match("^INTERFACE:%s*(.*)$"))
				local parsed = parse_interface_line(first)
				if parsed then
					table.insert(info.interfaces, parsed)
				end

			else
				if section == "interfaces" then
					local parsed = parse_interface_line(l)
					if parsed then
						table.insert(info.interfaces, parsed)
					end
				end
			end
		end
	end

	return info
end

function get_data()
	return {
		Load = get_nss_load(),
		Thermal = process_thermal_zones(get_thermal_zones()),
		Diag = get_nss_diag()
	}
end
