#
# Copyright (C) 2023-2026 DotyWrt
#
# This is free software, licensed under the Apache License, Version 3.0 .
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-deviceinfo
PKG_VERSION:=1.0
PKG_RELEASE:=1

PKG_LICENSE:=GPL-3.0
PKG_MAINTAINER:=dotycat <support@dotycat.com>

include $(TOPDIR)/feeds/luci/luci.mk

LUCI_TITLE:=LuCI Device Info
LUCI_DEPENDS:=+luci-base

# call BuildPackage - OpenWrt buildroot signature

$(eval $(call BuildPackage,$(PKG_NAME)))
