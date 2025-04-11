/** @param {NS} ns **/
export async function main(ns) {
    
    // Disable all logging to reduce clutter
    ns.disableLog('ALL');
    ns.clearLog();

    let maxNodes = 24; // Default to 24 nodes if no argument is provided
    let pct = 100; // Default to 100% of money available if no argument is provided

    let savedUpgrade = null; // Store the best upgrade to save up for

    while (true) {
        let myMoney = ns.getServerMoneyAvailable('home');
        let allowance = myMoney * (pct / 100);

        // If we have a saved upgrade and enough money, perform it
        if (savedUpgrade && savedUpgrade.cost <= allowance) {
            if (savedUpgrade.type === 'level') {
                ns.print(`Upgrading Level on Node ${savedUpgrade.node}`);
                ns.hacknet.upgradeLevel(savedUpgrade.node, 1);
            } else if (savedUpgrade.type === 'ram') {
                ns.print(`Upgrading RAM on Node ${savedUpgrade.node}`);
                ns.hacknet.upgradeRam(savedUpgrade.node, 1);
            } else if (savedUpgrade.type === 'core') {
                ns.print(`Upgrading Core on Node ${savedUpgrade.node}`);
                ns.hacknet.upgradeCore(savedUpgrade.node, 1);
            }
            savedUpgrade = null; // Reset saved upgrade after purchase
            continue;
        }

        // Purchase new nodes if within budget
        if (ns.hacknet.getPurchaseNodeCost() < allowance && ns.hacknet.numNodes() < maxNodes) {
            ns.print('Purchasing new node');
            ns.hacknet.purchaseNode();
            continue;
        }

        // Evaluate upgrades for each node
        let bestUpgrade = { node: -1, type: null, cost: Infinity, roi: 0 };
        for (let i = 0; i < ns.hacknet.numNodes(); i++) {
            let node = ns.hacknet.getNodeStats(i);
        
            // Base production rates
            const baseProductionPerLevel = 4.179; // Production increase per level
            const baseProductionPerRam = 0.146;  // Production increase per RAM
            const baseProductionPerCore = 0.697; // Production increase per core
        
            // Calculate ROI for level upgrade
            if (node.level < 200) {
                let cost = ns.hacknet.getLevelUpgradeCost(i, 1);
                let additionalProduction = baseProductionPerLevel;
                let roi = additionalProduction / cost;
                if (roi > bestUpgrade.roi) {
                    bestUpgrade = { node: i, type: 'level', cost, roi };
                }
            }
        
            // Calculate ROI for RAM upgrade
            if (node.ram < 64) {
                let cost = ns.hacknet.getRamUpgradeCost(i, 1);
                let upgradedProduction = node.level * baseProductionPerRam * (node.ram * 2);
                let currentProduction = node.level * baseProductionPerRam * node.ram;
                let additionalProduction = upgradedProduction - currentProduction;
                let roi = additionalProduction / cost;
                if (roi > bestUpgrade.roi) {
                    bestUpgrade = { node: i, type: 'ram', cost, roi };
                }
            }
            
            // Calculate ROI for core upgrade
            if (node.cores < 16) {
                let cost = ns.hacknet.getCoreUpgradeCost(i, 1);
                let upgradedProduction = node.level * baseProductionPerCore * (node.cores + 1);
                let currentProduction = node.level * baseProductionPerCore * node.cores;
                let additionalProduction = upgradedProduction - currentProduction;
                let roi = additionalProduction / cost;
                if (roi > bestUpgrade.roi) {
                    bestUpgrade = { node: i, type: 'core', cost, roi };
                }
            }
        }
        
        // Save the best upgrade if it's better than the current saved upgrade
        if (bestUpgrade.node !== -1 && (!savedUpgrade || bestUpgrade.roi > savedUpgrade.roi)) {
            savedUpgrade = bestUpgrade;
            ns.print(`Saving up for ${savedUpgrade.type} upgrade on Node ${savedUpgrade.node} (Cost: ${savedUpgrade.cost})`);
        }

        await ns.sleep(1); // eepytime :3
    }
}


/* 

Hacknet upgrade information

level 1 : $385 + $4.179 / sec

RAM: 1.00GB : $27 158 + $0.146 / sec -> + is equal to level times base. With every upgrade the + value is dubbled

cores: 1 : $452 635 + $0.697 / sec -> + is equal to level times base.

cores and ram seem to slightly impact each other but maybe for now ignore it.

*/