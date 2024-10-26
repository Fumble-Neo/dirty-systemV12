
Hooks.once('init', async function() {
  console.log("Dirty System | Initializing Dirty System");

  
  CONFIG.Actor.documentClass = DirtyActor;

  
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("dirty", DirtyActorSheet, { makeDefault: true });

  
  loadCSS("systems/dirty-system/styles/custom-styles.css");

  
  replaceLogo();
});


function loadCSS(filename) {
  const link = document.createElement("link");
  link.href = filename;
  link.rel = "stylesheet";
  link.type = "text/css";
  document.head.appendChild(link);
}


function replaceLogo() {
  window.addEventListener('DOMContentLoaded', () => {
      const logoElement = document.querySelector('#logo');
      if (logoElement) {
          logoElement.style.display = 'none';
      }

      const customLogo = document.createElement('img');
      customLogo.src = 'systems/dirty-system/packs/img/cropped-DCC_logo.png'; 
      customLogo.id = 'custom-logo'; 
      customLogo.style.position = 'absolute';
      customLogo.style.top = '10px';
      customLogo.style.left = '10px';
      customLogo.style.width = '50px';  
      customLogo.style.height = 'auto';
      customLogo.style.zIndex = '100';

      document.body.appendChild(customLogo);
  });
}


class DirtyActor extends Actor {
  prepareData() {
      super.prepareData();
      const data = this.system;

      
      data.custom = data.custom || {
          affronter: 0,
          endurer: 0,
          franchir: 0,
          connaitre: 0,
          raisonner: 0,
          utiliser: 0,
          influencer: 0,
          percevoir: 0,
          ressentir: 0,
          engagementContact: 0,
          engagementDistance: 0,
          reserveProfil: 0,  
          profil: 0,
          lien: 0,
          capaciteSecondaire: 0
      };

      
      data.memo = data.memo || {
          affronter: 0,
          endurer: 0,
          franchir: 0,
          connaitre: 0,
          raisonner: 0,
          utiliser: 0,
          influencer: 0,
          percevoir: 0,
          ressentir: 0,
          engagementContact: 0,
          engagementDistance: 0,
          reserveProfil: 0
      };

      
      data.profil = data.profil || "";
      data.style = data.style || "";
      data.attache = data.attache || "";
      data.ongletNotes = data.ongletNotes || "";
      data.possessionsNotes = data.possessionsNotes || "";

      
      if (!this.name || this.name.trim() === "") {
          this.name = "Personnage Sans Nom";
      }
  }

  async _preCreate(data, options, userId) {
      
      if (!data.name || data.name.trim() === "") {
          this.updateSource({ name: "Personnage Sans Nom" });
      }
      await super._preCreate(data, options, userId);
  }
}


function mapDiceToTension(result) {
  const tensionMap = {
      1: -2,
      2: -1,
      3: 0,
      4: 0,
      5: +1,
      6: +2
  };
  return tensionMap[result];
}


class DirtyActorSheet extends ActorSheet {
  
  static get defaultOptions() {
      return foundry.utils.mergeObject(super.defaultOptions, {
          classes: ["dirty", "sheet", "actor"],
          template: "systems/dirty-system/templates/character-sheet.html",
          tabs: [{ navSelector: ".tabs-navigation", contentSelector: ".content", initial: "attributes-tab" }],
          width: 710,
          height: 800
      });
  }

  
  getData() {
      const context = super.getData();
      context.system = this.actor.system;
      context.system.custom = this.actor.system.custom || {};
      context.system.memo = this.actor.system.memo || {};
      return context;
  }

  
  activateListeners(html) {
      super.activateListeners(html);

      
      html.find(".portrait-container").click(ev => this._onEditImage(ev));

      
      const tabs = html.find('.tabs-navigation li');
      const contents = html.find('.tab');
      tabs.on('click', function() {
          const tabIndex = $(this).index();
          tabs.removeClass('active');
          contents.removeClass('active');
          $(this).addClass('active');
          contents.eq(tabIndex).addClass('active');
      });
      if (tabs.filter('.active').length === 0) {
          tabs.first().addClass('active');
          contents.first().addClass('active');
      }

      let penalty = 0; 
      let reasonText = new Set();

      
      html.find('.memo-increase').click(ev => {
          const targetInputId = $(ev.currentTarget).data('target'); 
          const input = html.find(`#${targetInputId}`); 
          const newValue = parseInt(input.val()) + 1;
          input.val(newValue).trigger('change');
      });

      html.find('.memo-decrease').click(ev => {
          const targetInputId = $(ev.currentTarget).data('target');
          const input = html.find(`#${targetInputId}`);
          const newValue = Math.max(parseInt(input.val()) - 1, 0);
          input.val(newValue).trigger('change');
      });

      
      html.find('.bonus-checkbox').on('change', function(ev) {
          const checkbox = ev.currentTarget;
          const modifier = parseInt(checkbox.dataset.modifier);
          let reason;
          switch (checkbox.dataset.target) {
              case 'profil':
                  reason = `<i class="fas fa-user"></i> ${modifier > 0 ? '+' : ''}${modifier} Profil`;
                  break;
              case 'lien':
                  reason = `<i class="fas fa-link"></i> ${modifier > 0 ? '+' : ''}${modifier} Lien`;
                  break;
              case 'capaciteSecondaire':
                  reason = `<i class="fas fa-bolt"></i> ${modifier > 0 ? '+' : ''}${modifier} Capacité Secondaire`;
                  break;
              case 'tension':
                  reason = `<i class="fas fa-exclamation-triangle"></i> ${modifier > 0 ? '+' : ''}${modifier} Malus MJ`;
                  break;
              default:
                  reason = `${modifier > 0 ? '+' : ''}${modifier} Bonus`;
                  break;
          }

          console.log(`Checkbox changed: ${checkbox.checked}, Modifier: ${modifier}, Reason: ${reason}`);

          if (checkbox.checked) {
              reasonText.add(reason);
          } else {
              reasonText.delete(reason);
          }
      });

     
      html.find(".stat-name").on("click", async function() {
          if (ui.windows) {
              for (let key in ui.windows) {
                  if (ui.windows[key] instanceof Dialog) {
                      ui.windows[key].close();
                  }
              }
          }

          const parent = $(this).parent();
          const attribute = parent.data('attr');
          const customValue = parseInt(parent.find('input[type="number"]').val()) || 0;

          let totalBonus = 0;
          html.find('.bonus-checkbox:checked').each((index, checkbox) => {
              const modifier = parseInt(checkbox.dataset.modifier);
              totalBonus += modifier;
          });

          if (penalty !== 0) {
              reasonText.add(`❤️ ${penalty}`);
          }

          const totalValue = customValue + penalty + totalBonus;
          const difficulties = {
              "Facile (4)": 4,
              "Eng Distance (5)": 5,
              "Moyen (6)": 6,
              "Difficile (8)": 8,
              "Très difficile (10)": 10
          };

          const content = `
              <form>
                  <div class="form-group">
                      <label>Choisir la difficulté:</label>
                      <select id="difficulty" name="difficulty">
                          ${Object.entries(difficulties).map(([key, value]) => `<option value="${value}">${key}</option>`).join("")}
                      </select>
                  </div>
              </form>
          `;

          let dialog = new Dialog({
              title: "Choisir la difficulté",
              content: content,
              buttons: {
                  roll: {
                      icon: '<i class="fas fa-dice"></i>',
                      label: "Roll",
                      callback: async (html) => {
                          const difficulty = parseInt(html.find('[name="difficulty"]').val());
                          const roll = new Roll('1d6');
                          await roll.roll();

                          const tensionResult = mapDiceToTension(roll.total);
                          const total = tensionResult + totalValue;

                          const success = total >= difficulty;

                          console.log(`Final reasonText: ${Array.from(reasonText).join(', ')}`);

                          let content = `
                              <div class="roll-result ${success ? 'success' : 'failure'}">
                                  <div class="roll-header">
                                      <strong>Défi de ${attribute} (${customValue})</strong>
                                  </div>
                                  <div class="roll-details">
                                      <p><span class="roll-total">${roll.result} (<i class="fas fa-bolt"></i> ${tensionResult})</span> = <strong>${total}</strong></p>
                                      <p class="roll-outcome">${success ? "L'action est réussie" : "L'action a échoué"}</p>
                                      <p class="roll-reasons">Modificateurs appliqués: ${Array.from(reasonText).join(', ')}</p>
                                  </div>
                              </div>
                          `;

                          console.log(`Chat message content: ${content}`);

                          ChatMessage.create({
                              speaker: ChatMessage.getSpeaker(),
                              content: content,
                              rolls: [roll],
                          });
                      }
                  }
              },
              default: "roll",
              render: html => {
                  html.addClass('difficulty-dialog'); 
              }
          });

          dialog.render(true);
      });

      
      html.find('#roll-blessure').on('click', async function() {
          const options = {
              "Poings": "1d6",
              "Gourdin": "2d6, Choc",
              "Couteau, petit calibre": "2d6, Létal",
              "Hache, gros calibre": "3d6, Létal",
              "Nouvelle arme 1": "4d6, Choc",  
              "Nouvelle arme 2": "5d6, Létal"  
          };

          const content = `
              <form>
                  <div class="form-group">
                      <label>Choisissez une option :</label>
                      <select id="weapon-choice" name="weapon-choice">
                          ${Object.entries(options).map(([key, value]) => `<option value="${value}">${key} (${value})</option>`).join("")}
                      </select>
                  </div>
              </form>
          `;

          let dialog = new Dialog({
              title: "Sélection de Blessure",
              content: content,
              buttons: {
                  roll: {
                      icon: '<i class="fas fa-dice"></i>',
                      label: "Lancer",
                      callback: async (html) => {
                          const choice = html.find('[name="weapon-choice"]').val();
                          const rollFormula = choice.split(',')[0];
                          const roll = new Roll(rollFormula);
                          await roll.roll();

                          const results = roll.dice[0].results.map(r => r.result);
                          const maxRoll = Math.max(...results);
                          const hasDouble = results.some((val, i, arr) => arr.indexOf(val) !== i);

                          let message = '';
                          let penaltyReason = '';

                          if (maxRoll <= 5) {
                              penalty = -1;
                              message = "Le personnage subit un malus de -1 à tous ses Défis jusqu’à la fin de la scène.";
                              penaltyReason = "à cause d'une blessure légère.";
                          } else {
                              penalty = -3;
                              message = "Le personnage subit un malus de -3 à tous ses Défis jusqu’à ce qu’il soit soigné.";
                              penaltyReason = "à cause d'une blessure grave.";
                          }

                          if (!reasonText.has(`❤️ ${penalty}`)) {
                              reasonText.add(`❤️ ${penalty}`);
                          }

                          let content = `
                              <div class="roll-result ${penalty === -3 ? 'failure' : 'success'}">
                                  <div class="roll-header">
                                      <strong>Résultat du jet (${rollFormula})</strong>
                                  </div>
                                  <div class="roll-details">
                                      <p><span class="roll-total">${maxRoll}</span> = <strong>${maxRoll}</strong></p>
                                  </div>
                                  <div class="roll-details">
                                      <p>${message}</p>
                                  </div>
                              </div>
                          `;

                          if (hasDouble) {
                              content += `
                                  <div class="roll-result critical">
                                      <div class="roll-details">
                                          <p>⚠️ Déclenchement de l'Effet critique de l'arme s'il existe.</p>
                                      </div>
                                  </div>
                              `;
                          }

                          ChatMessage.create({
                              speaker: ChatMessage.getSpeaker(),
                              content: content,
                              rolls: [roll],
                          });
                      }
                  },
                  cancel: {
                      icon: '<i class="fas fa-times"></i>',
                      label: "Annuler"
                  }
              },
              default: "roll",
              render: html => {
                  html.addClass('weapon-dialog'); 
              }
          });

          dialog.render(true);
      });

      
      html.find('#roll-effroi').on('click', async function() {
          const options = {
              "Vision de cadavre": "1d6",
              "Vision de mutilation, hallucinations": "2d6",
              "Vision de souffrance extrême": "3d6",
              "Horreur cosmique": "4d6",
              "Nouvelle option 1": "5d6",  
              "Nouvelle option 2": "6d6"   
          };

          const content = `
              <form>
                  <div class="form-group">
                      <label>Choisissez une vision :</label>
                      <select id="fear-choice" name="fear-choice">
                          ${Object.entries(options).map(([key, value]) => `<option value="${value}">${key} (${value})</option>`).join("")}
                      </select>
                  </div>
              </form>
          `;

          let dialog = new Dialog({
              title: "Sélection de Vision Effroyable",
              content: content,
              buttons: {
                  roll: {
                      icon: '<i class="fas fa-dice"></i>',
                      label: "Lancer",
                      callback: async (html) => {
                          const choice = html.find('[name="fear-choice"]').val();
                          const rollFormula = choice.split(',')[0];
                          const roll = new Roll(rollFormula);
                          await roll.roll();

                          const results = roll.dice[0].results.map(r => r.result);
                          const maxRoll = Math.max(...results);
                          const hasDouble = results.some((val, i, arr) => arr.indexOf(val) !== i);

                          let message = '';
                          let penaltyReason = '';

                          if (maxRoll <= 5) {
                              penalty = -1;
                              message = "Le personnage subit un malus de -1 à tous ses Défis jusqu’à la fin de la scène.";
                              penaltyReason = "à cause d'une vision effrayante.";
                          } else {
                              penalty = -3;
                              message = "Le personnage subit un malus de -3 à tous ses Défis jusqu’à ce qu’il soit soigné.";
                              penaltyReason = "à cause d'une vision horrifique.";
                          }

                          if (!reasonText.has(`❤️ ${penalty}`)) {
                              reasonText.add(`❤️ ${penalty}`);
                          }

                          let content = `
                              <div class="roll-result ${penalty === -3 ? 'failure' : 'success'}">
                                  <div class="roll-header">
                                      <strong>Résultat du jet (${rollFormula})</strong>
                                  </div>
                                  <div class="roll-details">
                                      <p><span class="roll-total">${maxRoll}</span> = <strong>${maxRoll}</strong></p>
                                  </div>
                                  <div class="roll-details">
                                      <p>${message}</p>
                                  </div>
                              </div>
                          `;

                          if (hasDouble) {
                              content += `
                                  <div class="roll-result critical">
                                      <div class="roll-details">
                                          <p>⚠️ <span style="color:red;">Crise</span> : Un double sur le jet de dommages déclenche une <span style="color:red;">Crise</span>.
                                          Lorsqu’il est en proie à une <span style="color:red;">Crise</span>, le Personnage agit de manière irrationnelle et potentiellement dangereuse :
                                          panique et fuite, sidération et paralysie, violence, syncope. En cas de <span style="color:red;">Crise</span>, le Personnage reçoit un <span style="color:red;">Trauma</span>.</p>
                                      </div>
                                  </div>
                              `;
                          }

                          ChatMessage.create({
                              speaker: ChatMessage.getSpeaker(),
                              content: content,
                              rolls: [roll],
                          });
                      }
                  },
                  cancel: {
                      icon: '<i class="fas fa-times"></i>',
                      label: "Annuler"
                  }
              },
              default: "roll",
              render: html => {
                  html.addClass('fear-dialog'); 
              }
          });

          dialog.render(true);
      });

     
      html.find('#remove-penalty').on('click', function() {
          penalty = 0;
          reasonText.clear(); 
          ui.notifications.info("Le malus de blessure a été retiré.");
      });

      html.find('#remove-effroi-penalty').on('click', function() {
          penalty = 0;
          reasonText.clear(); 
          ui.notifications.info("Le malus de effroi a été retiré.");
      });
  }

 
  async _updateObject(event, formData) {
      const updateData = {};

      for (let [key, value] of Object.entries(formData)) {
          if (key.startsWith('system.custom.') || key.startsWith('system.memo.')) {
              updateData[key] = value;
          }
      }

      updateData['system.profil'] = formData['system.profil'];
      updateData['system.style'] = formData['system.style'];
      updateData['system.attache'] = formData['system.attache'];
      updateData['system.ongletNotes'] = formData['system.ongletNotes'];
      updateData['system.possessionsNotes'] = formData['system.possessionsNotes'];

      await this.actor.update(updateData);
  }

  
  _onEditImage(event) {
      const tokenImage = this.actor.token ? this.actor.token.img : this.actor.system.token?.img;

      const fp = new FilePicker({
          type: "image",
          current: tokenImage || "",
          callback: path => {
              if (this.actor.token) {
                  this.actor.update({ "token.img": path });
              } else {
                  this.actor.update({ "img": path });
              }
          },
          top: this.position.top + 40,
          left: this.position.left + 10
      });
      fp.browse();
  }
}
