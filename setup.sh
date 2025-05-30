#!/bin/sh

SRCTREE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

REQUIRED_DIRS=(
	"$SRCTREE/src/client"
	"$SRCTREE/src/server"
	"$SRCTREE/src/vmi"
	"$SRCTREE/src/websockify"
)

REQUIRED_PROGS=(
	python3
	node
	npm
	qemu-img
	qemu-system-x86_64
)

for D in "${REQUIRED_DIRS[@]}"; do
	if [[ ! -d "$D" ]]; then
		echo "ERROR: Required directory not found: $D"
		exit 1
	fi
done

for P in "${REQUIRED_PROGS[@]}"; do
	if ! command -v "$P" >/dev/null 2>&1; then
		echo "ERROR: Required program not installed or not in PATH: $P"
		exit 1
	fi
done

while :; do
	cat <<-EOF

	******************************************************************************
	**
	**    OneCore VMI Setup Script
	**
	**      1. INSTALL OneCore VMI
	**      2. UNINSTALL OneCore VMI
	**
	******************************************************************************

	EOF

	read -p "% " opt
	case "$opt" in
		1)
			# INSTALL
			read -e -p "Select Installation directory (Default: '/vmi') % " VMI_DIR
			VMI_DIR=${VMI_DIR:-/vmi}

			read -e -p "Select Logging directory (Default: '/var/log/vmi') % " LOG_DIR
			LOG_DIR=${LOG_DIR:-/var/log/vmi}

			read -e -p "Select HTTPS port (Default: '443') % " VMI_HTTPS_PORT
			VMI_HTTPS_PORT=${VMI_HTTPS_PORT:-443}

			read -e -p "Select HTTP port (Default: '80') % " VMI_HTTP_PORT
			VMI_HTTP_PORT=${VMI_HTTP_PORT:-80}

			echo " :: Creating directories..."
			sudo mkdir -p "$VMI_DIR" "$LOG_DIR"
			sudo chown -R "$USER" "$VMI_DIR" "$LOG_DIR"

			echo " :: Copying files..."
			cp -r "$SRCTREE/src/client"     "$VMI_DIR/web"
			cp -r "$SRCTREE/src/server"     "$VMI_DIR/srv"
			cp -r "$SRCTREE/src/websockify" "$VMI_DIR/websockify"
			cp -r "$SRCTREE/src/vmi"        "$VMI_DIR/content"

			echo " :: Installing Server Dependencies..."
			echo
			pushd "$VMI_DIR/srv" >/dev/null
			npm install
			popd >/dev/null

			cat <<-EOF

			******************************************************************************
			**
			**    Setup a user for OneCore VMI
			**
			**      You will need a USERNAME and PASSWORD in order to use VMI.
			**
			**        PASSWORD REQUIREMENTS:
			**
			**        1. MUST have atleast 8 characters OR MORE.
			**        2. MUST have atleast 2 SPECIAL characters.
			**        3. MUST have both LOWERCASE and UPPERCASE letters.
			**        4. MUST have atleast 2 numbers OR MORE.
			**
			******************************************************************************

			EOF
			node "$VMI_DIR/srv/mkauth.js" "$VMI_DIR/content"
			echo
			while :; do
				read -p "Do you wish to create certificates for VMI ? (Y/N) % " yn
				case "${yn^^}" in
					Y)
						echo
						sudo mkdir -p "$VMI_DIR/srv/certs"
						sudo chown -R "$USER" "$VMI_DIR/srv/certs"
						openssl req -x509 -newkey rsa:2048 \
							-keyout "$VMI_DIR/srv/certs/key.pem" \
							-out "$VMI_DIR/srv/certs/cert.pem" \
							-days 365 -nodes -config "$SRCTREE/misc/cert.cnf" -extensions v3_req
						break
						;;
					N)
						cat <<-WARN

						########################## IMPORTANT ##########################

						 Using no certificate is a SECURITY RISK and is NOT SUPPORTED
						 You will need to MANUALLY copy your certificates to:
						    $VMI_DIR/srv/certs/cert.pem - Certificate File
						    $VMI_DIR/srv/certs/key.pem  - Certificate Key

						###############################################################

						WARN
						break
						;;
					*)
						echo
						;;
				esac
			done

			cat <<-EOS | sudo tee "$VMI_DIR/runvmi.sh" >/dev/null
			#!/bin/sh
			VMIPATH="$VMI_DIR/content" node "$VMI_DIR/srv/index.js" --web-directory="$VMI_DIR/web" --certkey="$VMI_DIR/srv/certs/key.pem" --certfile="$VMI_DIR/srv/certs/cert.pem" --log-directory="$LOG_DIR" --websockify-directory="$VMI_DIR/websockify" $VMI_HTTPS_PORT $VMI_HTTP_PORT
			EOS
			sudo chmod +x "$VMI_DIR/runvmi.sh"

			echo "########################## SUCCESS ##########################"
			echo
			echo "  OneCore VMI has been installed successfully.               "
			echo "  You should now start VMI with the following command :      "
			echo "    sh \"$VMI_DIR/runvmi.sh\"                                "
			echo
			echo "#############################################################"

			echo " :: OneCore VMI installed successfully !"
			exit 0
			;;
		2)
			# UNINSTALL
			read -e -p "Enter VMI installation directory to UNINSTALL (Default: '/vmi') % " VMI_DIR
			VMI_DIR=${VMI_DIR:-/vmi}

			if [ ! -d "$VMI_DIR/content" ] || [ ! -d "$VMI_DIR/srv" ] || [ ! -d "$VMI_DIR/web" ] || [ ! -d "$VMI_DIR/websockify" ]; then
				echo " !! The selected directory doesn't seem to have VMI installed..."
				exit 1
			fi

			echo "This will uninstall VMI and delete all of its contents (VMs, Disks, Users...)"
			read -p "Do you want to UNINSTALL OneCore VMI ? (Y/N) % " confirm
			if [[ "${confirm^^}" == "Y" ]]; then
				sudo rm -rf "$VMI_DIR"
				echo " :: OneCore VMI uninstalled (deleted $VMI_DIR)."
				exit 0
			else
				echo " :: Aborted."
				exit 1
			fi
			;;
		*)
			echo " :: Invalid option. Please choose 1 or 2."
			;;
	esac
done
