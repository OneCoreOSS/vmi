# OneCore Virtual Machine Interface

> [!CAUTION]
> OneCore VMI is PRE-RELEASE SOFTWARE.
> This means you may encounter some bugs while using it.
> 
> OneCore VMI is also under active development, meaning it may change in the coming months.
> 
> TL;DR: Do not expect a fully finished or stable.

This repository hosts the content for OneCore VMI, including Client and Server code.

## Installing OneCore VMI

### Prerequisites

OneCore VMI can be installed on any modern Linux distributions with the following dependencies installed:

``nodejs , python3 , qemu , git``

Make sure these are installed before proceeding.

### Downloading VMI

Downloading VMI is very straightforward. Simply clone the repository and go inside of its directory.

```bash
$ git clone --recurse https://github.com/OneCoreOSS/vmi
$ cd vmi
```

If done correctly, you should now be inside the main VMI source tree.

### Setting up VMI

VMI comes with a built-in setup script so you don't have to setup everything yourself. Run the setup script as follows:

```bash
$ bash setup.sh

******************************************************************************
**
**    OneCore VMI Setup Script
**
**      1. INSTALL OneCore VMI
**      2. UNINSTALL OneCore VMI
**
******************************************************************************

% 
```

From this point on, simply follow the instructions inside of your terminal and once everything is done, you should see the following message :

```bash
########################## SUCCESS ##########################

  OneCore VMI has been installed successfully.               
  You should now start VMI with the following command :      
    sh "<path to your vmi installation>/runvmi.sh"                                  

#############################################################
 :: OneCore VMI installed successfully !
```

Run the command as instructed to start the VMI server.

### Running VMI

Now that you have everything ready, copy the command the setup script has given you and execute it :

```bash
$ sh "<path to your vmi installation>/runvmi.sh"  

******************************************************************************
** OneCoreVMI v0.1.0
**
** Running @ /vmi/content
** Logs    @ /var/log/vmi
******************************************************************************

HTTPS listening on :443
HTTP -> HTTPS redirect on port :80
```

Now head onto https://127.0.0.1 and you should be greeted with the OneCore VMI Authentication screen.

After logging in, you should be able to use VMI independently.

> [!NOTE] 
> If you encounter a 'PORT UNAUTHORIZED' error when running the script, try executing the following command ``sudo setcap 'cap_net_bind_service=+ep' $(which node)`` or even better ; change the default ports VMI use and setup a reverse proxy with Nginx or Apache. 

---

OneCore VMI is licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0.html) and comes with ABSOLUTELY NO WARRANTY.
