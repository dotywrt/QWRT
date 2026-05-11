module("luci.controller.netstat", package.seeall)

function index()
    entry({"admin", "system"}, firstchild(), _("System"), 50).dependent = false
    entry({"admin", "system", "netstat_config"}, cbi("netstat/config"), _("Netstat Config"), 20).leaf = true
    entry({"admin", "status", "vnstat"}, template("vnstat"), _("VnStats"), 30)
end
