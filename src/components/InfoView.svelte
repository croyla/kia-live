<script lang="ts">
	import type { Stop } from '$lib/structures/Stop';
	import { onMount, tick } from 'svelte';
	import { isMobile, infoViewWidth } from '$lib/stores/infoView';
	import { selected, selectedMetroStation } from '$lib/stores/discovery';
	import StopInfo from '$components/StopInfo.svelte';
	import type { Trip } from '$lib/structures/Trip';
	import type { LiveTrip } from '$lib/structures/LiveTrip';
	import TripInfo from '$components/TripInfo.svelte';
	import MetroStationInfo from '$components/MetroStationInfo.svelte';
	import { CupertinoPane } from 'cupertino-pane';

	let allStations: string[] = [];

	// paneVisible controls whether the div is in the DOM.
	// It is NOT the same as showPane — we delay setting it to false so the
	// close animation can play before Svelte removes the element.
	let paneVisible = false;
	let paneEl: HTMLDivElement;
	let pane: CupertinoPane | undefined;
	let closing = false; // prevent re-entrant close calls during animation
	let suppressDismiss = false;

	function handleResize() {
		isMobile.set(window.innerWidth < 764);
	}

	onMount(() => {
		handleResize();
		window.addEventListener('resize', handleResize);

		(async () => {
			try {
				const stationIndex = await fetch('metro/stops/index.json');
				const stationJSON = await stationIndex.json();
				allStations = stationJSON.map((station: any) => station.stop_id);
			} catch (error) {
				console.error('Failed to load metro station index:', error);
			}
		})();

		return () => {
			window.removeEventListener('resize', handleResize);
			pane?.destroy({ animate: false });
		};
	});

	function initPane() {
		if (!paneEl || pane) return;
		const sh = window.innerHeight;
		pane = new CupertinoPane(paneEl, {
			breaks: {
				top:    { enabled: true, height: Math.round(sh * 0.9) },
				middle: { enabled: true, height: Math.round(sh * 0.6) },
				bottom: { enabled: true, height: Math.round(sh * 0.2) }
			},
			initialBreak: 'middle',
			backdrop: false,
			fastSwipeClose: false,
			touchMoveStopPropagation: true,
			cssClass: 'info-pane',
			events: {
				onDidDismiss: () => {
					// User swiped the pane away — clear selection and remove element
					pane = undefined;
					paneVisible = false;
					if(suppressDismiss) {
						suppressDismiss = false;
						return;
					}
					selected.set(undefined);
					selectedMetroStation.set('');
				}
			}
		});
		pane.present({ animate: true });
	}

	$: selectedTrip = $selected as Trip | LiveTrip;
	$: selectedStop = $selected as Stop;
	$: hasSelectedMetro = allStations.includes($selectedMetroStation);
	$: showPane = $selected !== undefined || $selectedMetroStation !== '';

	// Open: put element in DOM, then init pane after Svelte renders it
	$: if ($isMobile && showPane && !paneVisible) {
		paneVisible = true;
		tick().then(initPane);
	}

	// Close (externally triggered, e.g. map tap): animate out, then remove element
	$: if ($isMobile && !showPane && paneVisible && !closing) {
		if (pane?.isPanePresented()) {
			closing = true;
			pane.destroy({ animate: true }).then(() => {
				pane = undefined;
				paneVisible = false;
				closing = false;
			});
		} else {
			paneVisible = false;
		}
	}

	// If screen switches to desktop while pane is open, switch to sidebar
	$: if (!$isMobile && pane) {
		suppressDismiss = true;
		pane.destroy({ animate: false });
		pane = undefined;
		paneVisible = false;
	}
</script>

{#if $isMobile}
	{#if paneVisible}
		<div bind:this={paneEl} class="font-[IBM_Plex_Sans] text-white px-6 py-2">
			{#if $selected !== undefined && !hasSelectedMetro}
				{#if Object.hasOwn($selected, 'stop_id')}
					<StopInfo stop={selectedStop} />
				{/if}
				{#if Object.hasOwn($selected, 'trip_id')}
					<TripInfo trip={selectedTrip} />
				{/if}
			{/if}
			{#if $selectedMetroStation !== ''}
				<MetroStationInfo stationId={$selectedMetroStation} />
			{/if}
		</div>
	{/if}
{:else if showPane}
	<!-- Sidebar Mode -->
	<div class="font-[IBM_Plex_Sans] fixed left-0 top-0 h-full max-w-21/48 w-[{$infoViewWidth}px] bg-black text-white px-6 py-8 shadow-lg z-[3] overflow-y-auto">
		{#if $selected !== undefined && !hasSelectedMetro}
			{#if Object.hasOwn($selected, 'stop_id')}
				<StopInfo stop={selectedStop} />
			{/if}
			{#if Object.hasOwn($selected, 'trip_id')}
				<TripInfo trip={selectedTrip} />
			{/if}
		{/if}
		{#if hasSelectedMetro}
			<MetroStationInfo stationId={$selectedMetroStation} />
		{/if}
	</div>
{/if}

<style>
	/* .info-pane is on the cupertino-pane wrapper; override its CSS variables */
	:global(.info-pane),
	:global(.info-pane .pane) {
		touch-action: none;
			max-width: 764px;
	}
	:global(.info-pane) {
			--cupertino-pane-destroy-button-background: #000000;
			--cupertino-pane-icon-close-color: #FFF;
		--cupertino-pane-background: #000000;
		--cupertino-pane-move-background: rgba(255, 255, 255, 0.3);
	}
</style>