include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-nssfw
PKG_VERSION:=1.0
PKG_RELEASE:=1

PKG_MAINTAINER:=dotycat <support@dotycat.com>
PKG_LICENSE:=Apache-2.0

LUCI_TITLE:=LuCI NSS info page
LUCI_DESCRIPTION:=Extended status page for NSS devices. Displays UBI core load, and CPU/WIFI/UBI temps
LUCI_DEPENDS:=+luci-base +luci-mod-status +kmod-qca-nss-drv @TARGET_qualcommax

PKG_BUILD_DIR := $(BUILD_DIR)/$(PKG_NAME)

include $(INCLUDE_DIR)/package.mk

define Package/$(PKG_NAME)
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=$(LUCI_TITLE)
  PKGARCH:=all
  DEPENDS:=$(LUCI_DEPENDS)
endef

define Package/$(PKG_NAME)/description
  $(LUCI_DESCRIPTION)
endef

define Build/Compile
endef

define Package/$(PKG_NAME)/install
	$(CP) ./files/* $(1)/
endef

$(eval $(call BuildPackage,$(PKG_NAME)))