# MxExplorer
This tool enables you to browse all entites (and some other data) in ANY Mendix application provided there is a session


Installation:
remove the old version of the MxExplorer, download the bookmark file and import it into Chrome or Firefox using the bookmark manager.
In edge the tool can only be added as a code snippet in the developer screen and run from there.


Usage:
Click the imported bookmark to open the tool, you should have a Mendix application open in the current tab.
When the tool opens a single new window is shown in the upper left corner of the screen, this window shows you information about the current Mendix version, the user which is logged in and the page which is shown, it is also possible to logout using the logout link.
On the bottom of the window there is are 3 links:
Browse entities
Browse cache
Browse constants

Clicking on the close button (X) on the main window will close ALL open windows and remove the MxExplorer app from the page, for any other window it will only close the specific window.
Clicking the minimize button (_) on any window will cause it to only still show the header of the window (saving you some space)

By clicking and holding the window header the window becomes draggable.
Clicking on a window which is behind other windows will cause the window to move to the front, no window will move in front of the main window (it will always be shown on top)

Browse entities: 
All entities for which the currently logged in user has read rights are shown here, using the filter field you can quickly search for an entity ny name (not the module name), also shown is either a search button, or a label NP (Non Persistent), the name of the entity can be clicked to show all attributes for the entity the color specifying whether the client has read only (red) or read and write rights (green).
Clicking on the search button will open a new window allowing you to browse the data in the entity.

Browse cache:
All non persistent object for this client session are visible here, use the "Refresh" button to update the list, when the ID (first column) is clicked the data window is shown.


Browse constants:
All constant which are exposed to the client with their values are visible here.


Data window:
The data window shows all attributes and values for the selected object (for which you have a monimum of read rights), when an association is shown either the GUID of the related object is shown (1-1 or 1-n on owning side) or "(Open to browse)" is shown (1-1, 1-n non owning side or n-n owning side).

When "(Open to browse)" is shown, in the case of a association to a persistent object, clicking on the line will reveal an embedded data grid which can be used to browse the related entries of the associated entity (you can only browse through the objects in the associated entry which have a relation with object you're browsing from).
When the associated object is a non-persistent entity a list of GUID's is shown, clicking on the GUID will reveal the data view of the non-persistent object.


Data grid
The datagrid retrieves data from an entity and allows the user to browse through it, the data is retrieved in chunks (paged) and can be filtered and sorted.

In the left top corner the current page is shown with the start and end entry of the page and the total number of entries, for instance 1 to 10 of 333.

A large text field is shown where the user can input an xpath which is used to filter the data, after providing an xpath pressing the Search button or CTRL + Enter triggers a new search (also forcing a refresh of the window).

The the left of the xpath field several buttons are shown which can be used in the creation of an xpath

To the absolute left a drop down is shown which allows you to specify the max amount of entries retrieved (and shown) per page.

Underneath the xpath row, the sorting row is shown, when no sorting is specified this will show "No Sorting", when sorting is specified it will show the column(s) sorting is on, as well as the sorting type, ↑ for ascending or ↓ for descending, clicking on the arrows will switch sorting between ascending and descending.
Sorting can be triggered by clicking the ↨ button next to and column name (sorting can only be done on attributes, not on associations or the GUID).
The sort order can be determined by dragging the sort cards into the wanted order.
Any sorting action will trigger an immidiate refresh of the data grid.

It is also possible to export all entries of any attribute column, use the » for this, note that this functionality exports ALL entries that match the provided xpath, so it can be slow and an impact on performance, use with care!

Clicking on a value in an attribute cell will cause an xpath search to be added to the xpath search field, this can also be handy to help you create xpaths containing date searches, their format can be a bit tricky.

The datagrid shows (like the data window) all attributes and associations for which the current user has a minimum of read rights, the order of the columns is the order in which the attributes are provided by Mendix

The first column always shows the GUID of the entry, all GUID's shown (also from associations) are clickable, clicking on them will open the data window
